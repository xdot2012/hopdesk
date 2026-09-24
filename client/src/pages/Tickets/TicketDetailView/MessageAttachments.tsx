import type { TicketAttachment } from '~/api/ticket/types';
import AuthenticatedImage from '~/components/AuthenticatedImage';
import { openAuthenticatedFile } from '~/lib/authenticatedFiles';
import { getFileTypeIcon, isImageContentType } from '~/lib/fileVisuals';

type MessageAttachmentsProps = {
  attachments: TicketAttachment[];
  openLabel: string;
};

export default function MessageAttachments({
  attachments,
  openLabel,
}: MessageAttachmentsProps) {
  if (!attachments.length) return null;

  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {attachments.map((attachment) => {
        const TypeIcon = getFileTypeIcon(attachment.contentType);
        const fileRef = attachment.url || attachment.fileKey;
        const isImage = isImageContentType(attachment.contentType) && Boolean(fileRef);

        return (
          <li key={attachment.id}>
            <button
              type="button"
              title={attachment.originalFilename}
              aria-label={openLabel}
              className="group flex w-20 flex-col gap-1 text-left"
              onClick={() => {
                if (!fileRef) return;
                void openAuthenticatedFile(fileRef);
              }}
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-md border border-border bg-muted/30 transition-colors group-hover:border-primary/40">
                {isImage ? (
                  <AuthenticatedImage
                    src={fileRef}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <TypeIcon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-foreground/90">
                {attachment.originalFilename}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
