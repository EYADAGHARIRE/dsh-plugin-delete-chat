window.__ModuleLoader__.load({
  id: 'dsh-plugin-delete-chat',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'deleteChat';

    const EN = {
      menu: 'Delete chat',
      title: 'Delete chat?',
      body: '“{title}” will be permanently deleted from this device.',
      warning: 'This cannot be undone. Any work still running in this chat is stopped first.',
      cancel: 'Cancel',
      delete: 'Delete',
      deleting: 'Deleting…',
      failed: 'Could not delete this chat: {message}',
      untitled: 'Untitled chat',
      close: 'Close',
    };

    const ZH = {
      menu: '删除会话',
      title: '删除会话？',
      body: '“{title}”将从此设备永久删除。',
      warning: '此操作无法撤销。该会话中仍在运行的工作会先被停止。',
      cancel: '取消',
      delete: '删除',
      deleting: '正在删除…',
      failed: '无法删除该会话：{message}',
      untitled: '未命名会话',
      close: '关闭',
    };

    // Styling mirrors the shipped menu rows (ui-primitives MenuItemButton) and
    // the shipped Modal + destructive-button pattern (ui-workspace dialogs):
    // only --dsw-* theme tokens, no literal colors. The row carries the same
    // destructive treatment as the shipped "Delete workspace" menu entry
    // (`MenuItemButton danger`): error-colored label and icon, and the
    // danger hover/focus fill instead of the neutral one.
    const STYLES =
      '.dchat-separator{height:.5px;margin:3px 2px;background:var(--dsw-alias-border-l2)}' +
      '.dchat-item{display:flex;align-items:center;gap:6px;width:100%;min-height:34px;padding:6px 8px;' +
      'border:none;border-radius:var(--dsw-radius-md);background:transparent;cursor:pointer;' +
      'font-size:13px;line-height:20px;color:var(--dsw-alias-state-error-primary);text-align:left}' +
      '.dchat-item:hover:not(:disabled),.dchat-item:focus-visible:not(:disabled){' +
      'background:var(--dsw-alias-interactive-bg-hover-danger);outline:none}' +
      '.dchat-itemIcon{display:inline-flex;flex:none;width:14px;height:14px;align-items:center;justify-content:center;' +
      'color:var(--dsw-alias-state-error-primary)}' +
      '.dchat-itemIcon svg{width:14px;height:14px}' +
      '.dchat-itemLabel{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.dchat-root{pointer-events:auto;position:fixed;inset:0;z-index:1000;display:flex;align-items:center;' +
      'justify-content:center;padding:max(24px,var(--dsh-frame-overlay-top, 24px)) 24px}' +
      '.dchat-mask{position:absolute;inset:var(--dsh-frame-chrome-top, 0px) 0 0;background:var(--dsw-alias-bg-mask-1);' +
      'backdrop-filter:var(--dsw-mask-blur);animation:dchat-fade var(--ds-transition-duration) var(--ds-ease-in-out)}' +
      '.dchat-dialog{box-sizing:border-box;position:relative;z-index:1;display:flex;flex-direction:column;gap:20px;' +
      'width:min(440px,100%);max-height:100%;padding:0 0 24px;overflow:hidden;border:0;' +
      'border-radius:var(--dsw-radius-panel, 12px);background:var(--dsw-alias-bg-layer-2);' +
      'box-shadow:var(--dsw-elevation-prominent);animation:dchat-rise var(--ds-transition-duration) var(--ds-ease-in-out)}' +
      '.dchat-dialog:focus{outline:none}' +
      '.dchat-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:22px 14px 12px 24px}' +
      '.dchat-title{margin:0;font-size:16px;line-height:24px;font-weight:500;color:var(--dsw-alias-label-primary)}' +
      '.dchat-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;' +
      'border:none;border-radius:var(--dsw-radius-sm);background:transparent;cursor:pointer;' +
      'color:var(--dsw-alias-label-secondary)}' +
      '.dchat-close:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.dchat-close:disabled{opacity:.4;cursor:not-allowed}' +
      '.dchat-description{margin:0;padding:0 24px;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary);' +
      'overflow-wrap:anywhere}' +
      '.dchat-body{display:flex;flex-direction:column;gap:12px;min-width:0;padding:0 24px}' +
      '.dchat-warning{display:flex;align-items:flex-start;gap:10px;color:var(--dsw-alias-label-secondary);' +
      'font-size:14px;line-height:22px}' +
      '.dchat-warningIcon{flex:none;margin-top:2px;color:var(--dsw-alias-state-error-primary)}' +
      '.dchat-warning p{margin:0;overflow-wrap:anywhere}' +
      '.dchat-error{margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;' +
      'overflow-wrap:anywhere}' +
      '.dchat-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:0 24px}' +
      '.dchat-button{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;' +
      'height:36px;min-width:72px;padding:0 14px;border:.5px solid var(--dsw-alias-border-l3);' +
      'border-radius:var(--dsw-radius-md);cursor:pointer;font-size:14px;line-height:22px;' +
      'color:var(--dsw-alias-label-primary);background:transparent}' +
      '.dchat-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}' +
      '.dchat-button:focus-visible{outline:var(--dsw-focus-ring-width) solid ' +
      'var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));outline-offset:2px}' +
      '.dchat-button:disabled{cursor:not-allowed;opacity:.4}' +
      '.dchat-danger:not(:disabled){color:var(--dsw-alias-state-error-primary)}' +
      '@keyframes dchat-rise{0%{opacity:0;transform:translateY(6px) scale(.98)}100%{opacity:1;transform:none}}' +
      '@keyframes dchat-fade{0%{opacity:0}100%{opacity:1}}' +
      '@media (prefers-reduced-motion:reduce){.dchat-mask,.dchat-dialog{animation:none}}';

    /** Render the shared style sheet; removing the component removes the styles. */
    function StyleSheet() {
      return h('style', null, STYLES);
    }

    /**
     * The shipped `IconTrashOutlineRegular` geometry (16×16 viewBox, 1px
     * currentColor stroke), copied path-for-path so this row's trash icon is
     * pixel-identical to the one the shipped "Delete workspace" row renders.
     * The `dchat-itemIcon svg` rule scales it to the 14px menu-icon slot.
     */
    function TrashIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none',
        xmlns: 'http://www.w3.org/2000/svg', strokeWidth: 1, 'aria-hidden': true,
      },
      h('path', { d: 'M1.28149 3.88831H14.7187', stroke: 'currentColor' }),
      h('path', {
        d: 'M5.41602 3.88833V2.47962C5.41602 2.29282 5.52492 2.11366 5.71876 1.98157' +
          'C5.9126 1.84948 6.17551 1.77527 6.44964 1.77527H9.55053C9.82466 1.77527' +
          ' 10.0876 1.84948 10.2814 1.98157C10.4753 2.11366 10.5842 2.29282 10.5842' +
          ' 2.47962V3.88833',
        stroke: 'currentColor',
      }),
      h('path', {
        d: 'M2.57349 3.88831L3.19366 13.2943C3.21937 13.5502 3.33952 13.7872 3.53065' +
          ' 13.9593C3.72178 14.1313 3.97016 14.2259 4.22729 14.2246H11.7728C12.0299' +
          ' 14.2259 12.2783 14.1313 12.4694 13.9593C12.6605 13.7872 12.7807 13.5502' +
          ' 12.8064 13.2943L13.4266 3.88831',
        stroke: 'currentColor',
      }),
      h('path', { d: 'M6.44946 6.98926V11.1238', stroke: 'currentColor' }),
      h('path', { d: 'M9.55054 6.98926V11.1238', stroke: 'currentColor' }));
    }

    function WarningIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 18, height: 18, fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
      },
      h('path', { d: 'M8 2.2 1.6 13.2h12.8L8 2.2Z' }),
      h('path', { d: 'M8 6v3.4' }),
      h('path', { d: 'M8 11.6v.01' }));
    }

    function CloseIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.4, strokeLinecap: 'round', 'aria-hidden': true,
      },
      h('path', { d: 'M4 4l8 8M12 4l-8 8' }));
    }

    /**
     * One Session row menu row. Renders a single `role="menuitem"` button and
     * dismisses the owner menu through the injected `useMenuOpenState` hook.
     */
    function DeleteChatMenuItem(props) {
      const { sessionId, displayTitle, useMenuOpenState, requestDeleteChat, t } = props;
      const [, setMenuOpen] = useMenuOpenState();
      return h(React.Fragment, null,
        h('div', { className: 'dchat-separator', 'aria-hidden': 'true' }),
        h('button', {
          type: 'button',
          role: 'menuitem',
          className: 'dchat-item',
          onClick() {
            setMenuOpen(false);
            requestDeleteChat({ sessionId, displayTitle: typeof displayTitle === 'string' ? displayTitle : '' });
          },
        },
        h('span', { className: 'dchat-itemIcon' }, h(TrashIcon)),
        h('span', { className: 'dchat-itemLabel' }, t('menu'))),
        h(StyleSheet));
    }

    function messageOf(reason) {
      if (reason instanceof Error) return reason.message;
      if (typeof reason === 'string') return reason;
      if (reason !== null && typeof reason === 'object' && typeof reason.message === 'string') return reason.message;
      return String(reason);
    }

    /**
     * Reads the pending request from the injected request store and mounts one
     * dialog per request. The dialog body is keyed by the request so in-flight
     * and error state die with each request.
     */
    function DeleteChatDialog(props) {
      const { useDeleteRequest } = props;
      const request = useDeleteRequest((pending) => pending);
      if (request === null) return null;
      return h(DeleteChatDialogBody, {
        key: `${request.sessionId}`,
        ...props,
        request,
      });
    }

    function DeleteChatDialogBody(props) {
      const { request, useSessions, startNewChat, deleteChat, closeDeleteRequest, t } = props;
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);
      const cancelRef = React.useRef(null);
      const dialogRef = React.useRef(null);
      // The sessions catalog is read at render time so the confirm handler can
      // tell whether this chat is the one currently shown in the main view.
      const list = useSessions((state) => state);

      React.useEffect(() => {
        if (cancelRef.current !== null) cancelRef.current.focus();
      }, []);

      const cancel = React.useCallback(() => {
        if (busy) return;
        closeDeleteRequest();
      }, [busy, closeDeleteRequest]);

      React.useEffect(() => {
        if (busy) return undefined;
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          cancel();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
      }, [busy, cancel]);

      // Keep Tab inside the dialog while it is open.
      const trapTab = (event) => {
        if (event.key !== 'Tab' || dialogRef.current === null) return;
        const nodes = Array.from(dialogRef.current.querySelectorAll('button:not([disabled])'));
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };

      const confirm = async () => {
        if (busy) return;
        setBusy(true);
        setError(null);
        const wasOpen = (list.byId[request.sessionId]?.retainedBy?.mainView ?? 0) > 0;
        // Leave the deleted chat before its row disappears so the main view is
        // never left holding a Session whose storage no longer exists.
        if (wasOpen) startNewChat();
        try {
          const result = await deleteChat(request.sessionId);
          if (result === null || result === undefined || result.ok !== true) {
            const failure = result !== null && result !== undefined && typeof result === 'object' ? result.error : undefined;
            throw new Error((failure && (failure.message || failure.code)) || 'unknown failure');
          }
          closeDeleteRequest();
        } catch (reason) {
          setBusy(false);
          setError(t('failed', { message: messageOf(reason) }));
        }
      };

      return h('div', {
        className: 'dchat-root',
        onMouseDown(event) {
          if (event.target === event.currentTarget) cancel();
        },
      },
      h('div', { className: 'dchat-mask', 'aria-hidden': 'true' }),
      h('div', {
        className: 'dchat-dialog',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'dchat-title',
        'aria-describedby': 'dchat-description',
        tabIndex: -1,
        ref: dialogRef,
        onMouseDown(event) {
          event.stopPropagation();
        },
        onKeyDown: trapTab,
      },
      h('div', { className: 'dchat-header' },
        h('h2', { className: 'dchat-title', id: 'dchat-title' }, t('title')),
        h('button', {
          type: 'button',
          className: 'dchat-close',
          'aria-label': t('close'),
          disabled: busy,
          onClick: cancel,
        }, h(CloseIcon))),
      h('p', { className: 'dchat-description', id: 'dchat-description' },
        t('body', { title: request.displayTitle || t('untitled') })),
      h('div', { className: 'dchat-body' },
        h('div', { className: 'dchat-warning' },
          h('span', { className: 'dchat-warningIcon' }, h(WarningIcon)),
          h('p', null, t('warning'))),
        error === null ? null : h('p', { className: 'dchat-error', role: 'alert' }, error)),
      h('div', { className: 'dchat-footer' },
        h('button', {
          type: 'button',
          ref: cancelRef,
          className: 'dchat-button',
          'data-modal-autofocus': true,
          disabled: busy,
          onClick: cancel,
        }, t('cancel')),
        h('button', {
          type: 'button',
          className: 'dchat-button dchat-danger',
          disabled: busy,
          onClick: confirm,
        }, busy ? t('deleting') : t('delete')))),
      h(StyleSheet));
    }

    /** Tiny `{ getSnapshot, subscribe }` store; becomes the `useDeleteRequest` hook. */
    function createRequestStore() {
      let value = null;
      const listeners = new Set();
      return {
        getSnapshot() {
          return value;
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        set(next) {
          if (Object.is(next, value)) return;
          value = next;
          for (const listener of [...listeners]) listener();
        },
      };
    }

    return {
      inject: ['slots', 'locale', 'connection', 'uiWorkspace'],
      apply(ctx) {
        const requests = createRequestStore();
        const requestDeleteChat = (request) => {
          requests.set(request);
        };
        const closeDeleteRequest = () => {
          requests.set(null);
        };

        ctx.effect(() => ctx.locale.register(NS, { en: EN, zh: ZH }), 'delete-chat: dictionaries');

        // Host call: authenticated generic Connection RPC. Never rejects for a
        // carrier problem; a failure is returned so the dialog can show it.
        const deleteChat = async (sessionId) => {
          try {
            return await ctx.connection.rpc.call('/session-delete', 'delete', { sessionId });
          } catch (reason) {
            return { ok: false, error: { code: 'session-delete/unreachable', message: messageOf(reason) } };
          }
        };

        const startNewChat = () => {
          const uiWorkspace = ctx.get('uiWorkspace');
          if (uiWorkspace !== undefined) uiWorkspace.startSession();
        };

        ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'dsh-plugin-delete-chat.menu',
          order: 500,
          locale: NS,
          inject: () => ({ requestDeleteChat }),
        }, DeleteChatMenuItem));

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'dsh-plugin-delete-chat.dialog',
          locale: NS,
          inject: () => ({
            hooks: { deleteRequest: requests },
            deleteChat,
            closeDeleteRequest,
            startNewChat,
          }),
        }, DeleteChatDialog));
      },
    };
  },
});
