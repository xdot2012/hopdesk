import http from '~/services/http';
import { UPLOAD_AVATAR_PATH } from '~/api';
import { formDataUploadConfig } from '~/lib/formDataUpload';

export interface UploadAvatarResponseProps {
  key: string;
  url: string;
}

export default async function uploadAvatar(file: File): Promise<UploadAvatarResponseProps> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await http.post<UploadAvatarResponseProps>(
    UPLOAD_AVATAR_PATH,
    formData,
    formDataUploadConfig,
  );

  return data;
}
