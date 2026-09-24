import type { AxiosRequestTransformer } from 'axios';

/** Drop Content-Type so the browser sets multipart boundary for FormData. */
export const clearContentTypeTransform: AxiosRequestTransformer = (body, headers) => {
  if (headers) {
    delete headers['Content-Type'];
  }
  return body;
};

export const formDataUploadConfig = {
  transformRequest: [clearContentTypeTransform],
};
