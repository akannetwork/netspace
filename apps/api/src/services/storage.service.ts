import { supabase } from '../config/supabase';

const BUCKET_NAME = 'media';
const CDN_URL = process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}` : '';

export class StorageService {

    /**
     * Uploads a file to Supabase Storage
     * @param tenantId The tenant ID (used for folder structure)
     * @param file The file object (from fastify-multipart)
     * @param folder Optional subfolder
     */
    async uploadFile(tenantId: string, file: any, folder: string = 'products') {
        const timestamp = Date.now();
        const safeFilename = file.filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const path = `${tenantId}/${folder}/${timestamp}-${safeFilename}`;

        // Convert stream to buffer because supabase-js storage expects Blob/Buffer/File
        const buffer = await file.toBuffer();

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(path, buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            // Check for specific "Bucket not found" error
            if (error.message.includes('Bucket not found') || (error as any).statusCode === '404') {
                console.log('Bucket not found. Attempting to create...');
                const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
                    public: true
                });

                if (createError) {
                    console.error('Failed to create bucket:', createError);
                    throw new Error(`Supabase Storage Error: ${error.message}`);
                }

                // Retry upload once
                const { error: retryError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(path, buffer, {
                        contentType: file.mimetype,
                        upsert: true
                    });

                if (retryError) {
                    console.error('Retry Upload Error:', retryError);
                    throw new Error(`Supabase Storage Error: ${retryError.message}`);
                }
            } else {
                console.error('Storage Upload Error Detail:', JSON.stringify(error, null, 2));
                throw new Error(`Supabase Storage Error: ${error.message || 'Unknown error'}`);
            }
        }

        // Return public URL
        // Manual construction is faster if we know the structure
        return `${CDN_URL}/${path}`;
    }
}

export const storageService = new StorageService();
