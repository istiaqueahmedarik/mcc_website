import { createRouteHandler, createUploadthing } from 'uploadthing/next';

const f = createUploadthing();

const ourFileRouter = {
  editorUploader: f(['image', 'text', 'blob', 'pdf', 'video', 'audio'])
    .middleware(() => {
      return {};
    })
    .onUploadComplete(({ file }) => {
      return { file };
    })
};

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
