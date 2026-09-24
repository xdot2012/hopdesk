import http from '~/services/http';
import { TICKET_ATTACHMENTS_PATH } from '~/api';
import { formDataUploadConfig } from '~/lib/formDataUpload';

export type UploadTicketAttachmentResponse = {
  key: string;
  url: string;
  contentType: string;
  size: number;
  originalFilename: string;
};

export default async function uploadTicketAttachment(
  file: File,
): Promise<UploadTicketAttachmentResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await http.post<UploadTicketAttachmentResponse>(
    TICKET_ATTACHMENTS_PATH,
    formData,
    formDataUploadConfig,
  );

  return data;
}
