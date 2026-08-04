import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { type PointerEvent as ReactPointerEvent } from 'react';

/**
 * 基于 Pointer Events 的列表拖拽排序 Hook（带跟手动画）
 *
 * - 使用指针事件（而非 HTML5 draggable）绕过 Tauri WKWebView 对原生 drag API 的拦截
 * - 拖动中在原卡片位置渲染一个 `fixed` 定位的 DOM 克隆覆盖层，实时跟随光标
 * - 原卡片以 `opacity` 弱化显示作为占位，释放后位置立即应用
 * - 覆盖层通过 ref 直接修改 style，避免每次 pointermove 触发 React 重渲染
 */
export function useDragSort(onReorder: (fromIndex: number, toIndex: number) => void) {
  const [dragIndexState, setDragIndexState] = useState<number | null>(null);
  const [overIndexState, setOverIndexState] = useState<number | null>(null);
  const [overlay, setOverlay] = useState<{
    node: HTMLElement;
    width: number;
    height: number;
    pointerOffsetX: number;
    pointerOffsetY: number;
  } | null>(null);

  const dragIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const overlayElRef = useRef<HTMLDivElement | null>(null);
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const setItemRef = useCallback((idx: number, el: HTMLElement | null) => {
    if (el) {
      itemRefs.current.set(idx, el);
    } else {
      itemRefs.current.delete(idx);
    }
  }, []);

  // 仅在拖拽激活期间，注册窗口级 pointermove / pointerup 监听
  useEffect(() => {
    if (dragIndexRef.current === null) return;

    const computeOver = (clientX: number, clientY: number) => {
      if (!overlay) return;
      // 拖动卡片的中心 = 光标位置减去指针在卡片内的偏移
      const dragCenterX = clientX - overlay.pointerOffsetX + overlay.width / 2;
      const dragCenterY = clientY - overlay.pointerOffsetY + overlay.height / 2;

      // 仅当拖动卡片进入目标卡片 55% 以上的区域时才触发排序
      // (相当于需要拖动约 2/3 距离，避免过于灵敏)
      const OVERLAP_THRESHOLD = 0.55;

      let chosen: number | null = null;
      for (const [idx, el] of itemRefs.current.entries()) {
        if (idx === dragIndexRef.current) continue;
        const rect = el.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        // 拖动卡片与目标卡片在 X/Y 轴上的重叠长度
        const left = Math.max(rect.left, dragCenterX - overlay.width / 2);
        const right = Math.min(rect.right, dragCenterX + overlay.width / 2);
        const top = Math.max(rect.top, dragCenterY - overlay.height / 2);
        const bottom = Math.min(rect.bottom, dragCenterY + overlay.height / 2);

        if (right <= left || bottom <= top) continue; // 无重叠

        const overlapW = right - left;
        const overlapH = bottom - top;
        const overlapRatioW = overlapW / w;
        const overlapRatioH = overlapH / h;

        if (overlapRatioW >= OVERLAP_THRESHOLD && overlapRatioH >= OVERLAP_THRESHOLD) {
          chosen = idx;
          break;
        }
      }

      if (chosen !== null && overIndexRef.current !== chosen) {
        overIndexRef.current = chosen;
        setOverIndexState(chosen);
      } else if (chosen === null && overIndexRef.current !== null) {
        overIndexRef.current = null;
        setOverIndexState(null);
      }
    };

    const moveOverlay = (clientX: number, clientY: number) => {
      const el = overlayElRef.current;
      if (!el || !overlay) return;
      el.style.left = `${clientX - overlay.pointerOffsetX}px`;
      el.style.top = `${clientY - overlay.pointerOffsetY}px`;
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };

    const onPointerMove = (e: globalThis.PointerEvent) => {
      moveOverlay(e.clientX, e.clientY);
      computeOver(e.clientX, e.clientY);
    };

    const finishDrag = (e: globalThis.PointerEvent) => {
      moveOverlay(e.clientX, e.clientY);
      const from = dragIndexRef.current;
      const over = overIndexRef.current;
      if (from !== null && over !== null && from !== over) {
        onReorderRef.current(from, over);
      }
      dragIndexRef.current = null;
      overIndexRef.current = null;
      setDragIndexState(null);
      setOverIndexState(null);
      setOverlay(null);
      cleanup();
    };

    const onPointerUp = finishDrag;
    const onPointerCancel = finishDrag;

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    return cleanup;
  }, [dragIndexState, overlay]);

  const getItemDragProps = (index: number) => ({
    ref: (el: HTMLElement | null) => setItemRef(index, el),
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'button, a, input, textarea, select, svg, path, [role="button"], [role="switch"], [role="option"], [role="listbox"]'
        )
      ) {
        return;
      }
      const card = e.currentTarget as HTMLElement;
      const rect = card.getBoundingClientRect();
      e.stopPropagation();
      e.preventDefault();

      // 克隆原卡片作为覆盖层（跟随光标）
      const clone = card.cloneNode(true) as HTMLElement;
      clone.style.margin = '0';
      clone.style.pointerEvents = 'none';
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.transition = 'box-shadow 150ms ease-out';
      clone.style.boxShadow = '0 20px 40px -8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(56, 189, 248, 0.25)';

      dragIndexRef.current = index;
      overIndexRef.current = null;
      setDragIndexState(index);
      setOverIndexState(null);
      setOverlay({
        node: clone,
        width: rect.width,
        height: rect.height,
        pointerOffsetX: e.clientX - rect.left,
        pointerOffsetY: e.clientY - rect.top,
      });
    },
  });

  const isDragging = (index: number) => dragIndexState === index;
  const isDropTarget = (index: number) =>
    overIndexState === index && dragIndexState !== null && dragIndexState !== index;

  // 通过 portal 将克隆渲染到 body，脱离父级 overflow / transform 限制
  const overlayEl =
    overlay && dragIndexState !== null
      ? createPortal(
          <div
            ref={(el) => {
              overlayElRef.current = el;
              if (el) {
                // 清空旧 children 并挂载克隆
                while (el.firstChild) el.removeChild(el.firstChild);
                el.appendChild(overlay.node);
                // 初始位置：让第一次 pointermove 接管
                const rect = itemRefs.current.get(dragIndexState!)?.getBoundingClientRect();
                if (rect) {
                  el.style.left = `${rect.left}px`;
                  el.style.top = `${rect.top}px`;
                }
              }
            }}
            style={{
              position: 'fixed',
              width: overlay.width,
              height: overlay.height,
              zIndex: 9999,
              pointerEvents: 'none',
              transform: 'rotate(1.2deg) scale(1.02)',
              transition: 'transform 120ms ease-out',
            }}
          />,
          document.body
        )
      : null;

  return { getItemDragProps, isDragging, isDropTarget, overlayEl };
}
