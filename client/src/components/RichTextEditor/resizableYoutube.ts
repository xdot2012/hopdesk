import {
  getRenderedAttributes,
  mergeAttributes,
  ResizableNodeView,
  type ResizableNodeViewDirection,
  type ResizableNodeViewOptions,
} from '@tiptap/core';
import Youtube, { getEmbedUrlFromYoutubeUrl } from '@tiptap/extension-youtube';

type YoutubeResizeOptions = {
  enabled: boolean;
  directions?: ResizableNodeViewDirection[];
  minWidth?: number;
  minHeight?: number;
  alwaysPreserveAspectRatio?: boolean;
};

const ResizableYoutube = Youtube.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      resize: {
        enabled: true,
        minWidth: 240,
        minHeight: 135,
        alwaysPreserveAspectRatio: true,
      } satisfies YoutubeResizeOptions,
    } as ReturnType<NonNullable<typeof this.parent>>;
  },

  addNodeView() {
    const resize = (this.options as { resize?: YoutubeResizeOptions }).resize;
    if (!resize?.enabled || typeof document === 'undefined') {
      return null;
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = resize;
    const resizeManagedAttributes = new Set(['src', 'width', 'height', 'start']);
    const extensionOptions = this.options;

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.className = 'rounded-lg';
      iframe.style.border = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.display = 'block';

      const applySrc = (attrs: Record<string, unknown>) => {
        const embedUrl = getEmbedUrlFromYoutubeUrl({
          url: attrs.src as string,
          allowFullscreen: extensionOptions.allowFullscreen,
          autoplay: extensionOptions.autoplay,
          ccLanguage: extensionOptions.ccLanguage,
          ccLoadPolicy: extensionOptions.ccLoadPolicy,
          controls: extensionOptions.controls,
          disableKBcontrols: extensionOptions.disableKBcontrols,
          enableIFrameApi: extensionOptions.enableIFrameApi,
          endTime: extensionOptions.endTime,
          interfaceLanguage: extensionOptions.interfaceLanguage,
          ivLoadPolicy: extensionOptions.ivLoadPolicy,
          loop: extensionOptions.loop,
          modestBranding: extensionOptions.modestBranding,
          nocookie: extensionOptions.nocookie,
          origin: extensionOptions.origin,
          playlist: extensionOptions.playlist,
          progressBarColor: extensionOptions.progressBarColor,
          startAt: (attrs.start as number) || 0,
          rel: extensionOptions.rel,
        });

        if (embedUrl) {
          iframe.src = embedUrl;
        }
      };

      const mergedAttributes = mergeAttributes(extensionOptions.HTMLAttributes, HTMLAttributes);
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value != null && !resizeManagedAttributes.has(key)) {
          iframe.setAttribute(key, String(value));
        }
      });
      applySrc(HTMLAttributes);

      let previousHTMLAttributes = { ...HTMLAttributes };

      const onUpdate: ResizableNodeViewOptions['onUpdate'] = (updatedNode) => {
        if (updatedNode.type !== node.type) {
          return false;
        }

        const extensionAttributes = editor.extensionManager.attributes.filter(
          (attribute) => attribute.type === updatedNode.type.name,
        );
        const newHTMLAttributes = getRenderedAttributes(updatedNode, extensionAttributes);

        Object.keys(previousHTMLAttributes).forEach((key) => {
          if (!resizeManagedAttributes.has(key) && !(key in newHTMLAttributes)) {
            iframe.removeAttribute(key);
          }
        });

        Object.entries(newHTMLAttributes).forEach(([key, value]) => {
          if (resizeManagedAttributes.has(key)) {
            return;
          }
          if (value != null) {
            iframe.setAttribute(key, String(value));
          } else {
            iframe.removeAttribute(key);
          }
        });

        applySrc(newHTMLAttributes);
        previousHTMLAttributes = newHTMLAttributes;

        return true;
      };

      const nodeView = new ResizableNodeView({
        element: iframe,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          iframe.style.width = `${width}px`;
          iframe.style.height = `${height}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) {
            return;
          }

          editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, { width, height })
            .run();
        },
        onUpdate,
        options: {
          directions,
          min: {
            width: minWidth,
            height: minHeight,
          },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
          className: {
            container: 'media-resize-container',
            wrapper: 'media-resize-wrapper',
            handle: 'media-resize-handle',
            resizing: 'is-resizing',
          },
        },
      });

      return nodeView;
    };
  },
});

export default ResizableYoutube;
