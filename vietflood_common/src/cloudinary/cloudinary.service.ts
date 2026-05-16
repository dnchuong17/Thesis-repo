import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import {
    v2 as cloudinary,
    UploadApiErrorResponse,
    UploadApiOptions,
    UploadApiResponse,
} from 'cloudinary';

@Injectable()
export class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });
    }

    isConfigured(): boolean {
        return !!(
            process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        );
    }

    private ensureConfigured() {
        if (!this.isConfigured()) {
            throw new InternalServerErrorException(
                'Cloudinary is not configured properly',
            );
        }
    }

    async uploadBuffer(
        fileBuffer: Buffer,
        options?: UploadApiOptions,
    ): Promise<UploadApiResponse> {
        this.ensureConfigured();

        if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
            throw new BadRequestException('Invalid file buffer');
        }

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'vietflood/uploads',
                    resource_type: 'auto',
                    ...options,
                },
                (
                    error: UploadApiErrorResponse | undefined,
                    result: UploadApiResponse | undefined,
                ) => {
                    if (error) {
                        return reject(
                            new InternalServerErrorException(
                                error.message || 'Cloudinary upload failed',
                            ),
                        );
                    }

                    if (!result) {
                        return reject(
                            new InternalServerErrorException('Cloudinary upload returned no result'),
                        );
                    }

                    resolve(result);
                },
            );

            uploadStream.end(fileBuffer);
        });
    }

    async uploadFilePath(
        filePath: string,
        options?: UploadApiOptions,
    ): Promise<UploadApiResponse> {
        this.ensureConfigured();

        if (!filePath) {
            throw new BadRequestException('Invalid file path');
        }

        try {
            return await cloudinary.uploader.upload(filePath, {
                folder: 'vietflood/uploads',
                resource_type: 'auto',
                ...options,
            });
        } catch (error) {
            throw new InternalServerErrorException(
                error instanceof Error ? error.message : 'Cloudinary upload failed',
            );
        }
    }

    async uploadBase64(
        base64: string,
        options?: UploadApiOptions,
    ): Promise<UploadApiResponse> {
        this.ensureConfigured();

        if (!base64) {
            throw new BadRequestException('Invalid base64 data');
        }

        try {
            return await cloudinary.uploader.upload(base64, {
                folder: 'vietflood/uploads',
                resource_type: 'auto',
                ...options,
            });
        } catch (error) {
            throw new InternalServerErrorException(
                error instanceof Error ? error.message : 'Cloudinary upload failed',
            );
        }
    }

    async deleteFile(
        publicId: string,
        resourceType: 'image' | 'video' | 'raw' = 'image',
    ) {
        this.ensureConfigured();

        if (!publicId) {
            throw new BadRequestException('Invalid public_id');
        }

        try {
            return await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType,
            });
        } catch (error) {
            throw new InternalServerErrorException(
                error instanceof Error ? error.message : 'Cloudinary delete failed',
            );
        }
    }

    async deleteMany(
        publicIds: string[],
        resourceType: 'image' | 'video' | 'raw' = 'image',
    ) {
        this.ensureConfigured();

        if (!publicIds?.length) {
            throw new BadRequestException('publicIds is required');
        }

        try {
            return await cloudinary.api.delete_resources(publicIds, {
                resource_type: resourceType,
            });
        } catch (error) {
            throw new InternalServerErrorException(
                error instanceof Error ? error.message : 'Cloudinary bulk delete failed',
            );
        }
    }

    async renameFile(
        fromPublicId: string,
        toPublicId: string,
        overwrite = true,
    ) {
        this.ensureConfigured();

        if (!fromPublicId || !toPublicId) {
            throw new BadRequestException('Invalid public id');
        }

        try {
            return await cloudinary.uploader.rename(fromPublicId, toPublicId, {
                overwrite,
            });
        } catch (error) {
            throw new InternalServerErrorException(
                error instanceof Error ? error.message : 'Cloudinary rename failed',
            );
        }
    }

    getOptimizedImageUrl(
        publicId: string,
        options?: {
            width?: number;
            height?: number;
            crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit';
            quality?: string | number;
            format?: string;
        },
    ): string {
        this.ensureConfigured();

        if (!publicId) {
            throw new BadRequestException('Invalid public_id');
        }

        return cloudinary.url(publicId, {
            secure: true,
            fetch_format: options?.format || 'auto',
            quality: options?.quality || 'auto',
            width: options?.width,
            height: options?.height,
            crop: options?.crop || 'fill',
        });
    }

    getRawUrl(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): string {
        this.ensureConfigured();

        if (!publicId) {
            throw new BadRequestException('Invalid public_id');
        }

        return cloudinary.url(publicId, {
            secure: true,
            resource_type: resourceType,
        });
    }
}