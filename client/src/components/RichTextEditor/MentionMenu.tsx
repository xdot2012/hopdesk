import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { useTranslation } from 'react-i18next';
import {
  buildSearchMentionOptionsUrl,
  ticketFilterUserLabel,
  type TicketFilterUserOption,
  type TicketFilterUserPage,
} from '~/api/ticket/searchFilterUsers';
import http from '~/services/http';
import { scrollPortaledOnWheel } from '~/lib/portaledScroll';
import { cn } from '~/lib/utils';

export type MentionSuggestionItem = {
  id: string;
  label: string;
  email: string;
};

type MentionMenuState = {
  items: MentionSuggestionItem[];
  selectedIndex: number;
  clientRect: (() => DOMRect | null) | null;
  command: ((item: MentionSuggestionItem) => void) | null;
};

type MentionMenuProps = {
  editor: Editor;
  bridgeRef: MutableRefObject<MentionSuggestionBridge>;
};

export type MentionSuggestionBridge = {
  onStart: (props: SuggestionProps<MentionSuggestionItem>) => void;
  onUpdate: (props: SuggestionProps<MentionSuggestionItem>) => void;
  onExit: () => void;
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

function toSuggestionItems(users: TicketFilterUserOption[]): MentionSuggestionItem[] {
  return users.map((user) => ({
    id: user.id,
    label: ticketFilterUserLabel(user),
    email: user.email,
  }));
}

export async function fetchMentionSuggestionItems(query: string): Promise<MentionSuggestionItem[]> {
  const url = buildSearchMentionOptionsUrl({ search: query, size: 8 });
  const { data } = await http.get<TicketFilterUserPage>(url);
  return toSuggestionItems(data.items ?? []);
}

export function createEmptyMentionBridge(): MentionSuggestionBridge {
  return {
    onStart: () => undefined,
    onUpdate: () => undefined,
    onExit: () => undefined,
    onKeyDown: () => false,
  };
}

export default function MentionMenu({ editor, bridgeRef }: MentionMenuProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<MentionMenuState | null>(null);
  const selectedIndexRef = useRef(0);
  const stateRef = useRef<MentionMenuState | null>(null);

  const applyState = useCallback((next: MentionMenuState | null) => {
    stateRef.current = next;
    selectedIndexRef.current = next?.selectedIndex ?? 0;
    setState(next);
  }, []);

  useEffect(() => {
    bridgeRef.current = {
      onStart: (props) => {
        applyState({
          items: props.items,
          selectedIndex: 0,
          clientRect: props.clientRect ?? null,
          command: props.command,
        });
      },
      onUpdate: (props) => {
        applyState({
          items: props.items,
          selectedIndex: 0,
          clientRect: props.clientRect ?? null,
          command: props.command,
        });
      },
      onExit: () => applyState(null),
      onKeyDown: ({ event }) => {
        const current = stateRef.current;
        if (!current || current.items.length === 0) return false;

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          const nextIndex = (selectedIndexRef.current + 1) % current.items.length;
          selectedIndexRef.current = nextIndex;
          applyState({ ...current, selectedIndex: nextIndex });
          return true;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          const nextIndex =
            (selectedIndexRef.current - 1 + current.items.length) % current.items.length;
          selectedIndexRef.current = nextIndex;
          applyState({ ...current, selectedIndex: nextIndex });
          return true;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          const item = current.items[selectedIndexRef.current];
          if (item) current.command?.(item);
          return true;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          applyState(null);
          return true;
        }

        return false;
      },
    };
  }, [applyState, bridgeRef]);

  const coords = useMemo(() => {
    if (!state?.clientRect) return null;
    const rect = state.clientRect();
    if (!rect) return null;

    const menuWidth = 280;
    const menuMaxHeight = 256;
    const gap = 8;
    const viewportPadding = 8;

    let top = rect.bottom + gap;
    let left = rect.left;

    if (top + menuMaxHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, rect.top - menuMaxHeight - gap);
    }
    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
    }
    if (left < viewportPadding) {
      left = viewportPadding;
    }

    return { top, left };
  }, [state]);

  // Keep editor reference used so React doesn't warn about unused prop when menu closed.
  void editor;

  if (!state || !coords || state.items.length === 0) {
    return null;
  }

  return createPortal(
    <div
      role="listbox"
      aria-label={t('navbar.mentionMenu')}
      className="rich-text-editor-mention-menu pointer-events-auto fixed z-[210] max-h-64 w-[280px] overflow-y-auto overscroll-contain rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      style={{ top: coords.top, left: coords.left }}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={scrollPortaledOnWheel}
    >
      <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        {t('navbar.mentionMenu')}
      </p>
      {state.items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={index === state.selectedIndex}
          className={cn(
            'flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors',
            index === state.selectedIndex
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent hover:text-accent-foreground',
          )}
          onMouseDown={(event) => {
            event.preventDefault();
            state.command?.(item);
          }}
          onMouseEnter={() => {
            selectedIndexRef.current = index;
            applyState({ ...state, selectedIndex: index });
          }}
        >
          <span className="font-medium">{item.label}</span>
          <span className="text-xs text-muted-foreground">{item.email}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
