'use server'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const bucketName = 'uploads';

export async function uploadFileToStorage(formData) {
  try {
    const file = formData.get('file');
    if (!file) {
      throw new Error('No file provided');
    }

    const timestamp = Date.now();
    const filePath = `${timestamp}-${file.name}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) throw error;

    const fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
    
    return {
      success: true,
      data: {
        key: `${bucketName}/${filePath}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,
      }
    };
  } catch (error) {
    console.error('Server upload error:', error);
    return {
      success: false,
      error: error.message || 'Something went wrong during upload'
    };
  }
}
