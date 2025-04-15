import * as React from 'react';
import { toast } from 'sonner';
import { uploadFileToStorage } from './supFileUp';

export function useUploadFile({
  onUploadComplete,
  onUploadError,
  ...props
} = {}) {
  const [uploadedFile, setUploadedFile] = React.useState();
  const [uploadingFile, setUploadingFile] = React.useState();
  const [progress, setProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const progressTimerRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  async function uploadFile(file) {
    if (!file) return null;

    setIsUploading(true);
    setUploadingFile(file);
    setProgress(0);

    progressTimerRef.current = setInterval(() => {
      setProgress(prevProgress => {
        const newProgress = prevProgress + (1 + Math.random() * 3);
        return Math.min(newProgress, 99);
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadFileToStorage(formData);

      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;

      setProgress(100);

      if (!result.success) {
        throw new Error(result.error);
      }

      const fileData = result.data;
      setUploadedFile(fileData);

      if (onUploadComplete) {
        onUploadComplete(fileData);
      }

      return fileData;
    } catch (error) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
      
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);

      if (onUploadError) {
        onUploadError(error);
      }

      return null;
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadingFile(undefined);
      }, 500);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile,
    uploadingFile,
  };
}

export function getErrorMessage(err) {
  const unknownError = 'Something went wrong, please try again later.';

  if (err?.message) {
    return err.message;
  } else if (typeof err === 'string') {
    return err;
  } else {
    return unknownError;
  }
}

export function showErrorToast(err) {
  const errorMessage = getErrorMessage(err);
  return toast.error(errorMessage);
}
