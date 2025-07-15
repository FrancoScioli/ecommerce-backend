import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {

    const configRegion = this.config.get<string>("AWS_REGION");
    const configBucket = this.config.get<string>("S3_BUCKET_NAME");
    const configKeyId = this.config.get<string>("AWS_ACCESS_KEY_ID");
    const configSecret = this.config.get<string>("AWS_SECRET_ACCESS_KEY");

    if (!configRegion) throw new Error("Variable de entorno AWS_REGION no definida");
    if (!configBucket) throw new Error("Variable de entorno S3_BUCKET_NAME no definida");
    if (!configKeyId) throw new Error("Variable de entorno AWS_ACCESS_KEY_ID no definida");
    if (!configSecret) throw new Error("Variable de entorno AWS_SECRET_ACCESS_KEY no definida");

    this.region = configRegion;
    this.bucketName = configBucket;

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: configKeyId,
        secretAccessKey: configSecret,
      },
    });
  }

  /**
   * Sube un archivo recibido por Multer (en memoria) a S3.
   * Retorna la URL pública para uso inmediato (ej. para guardarla en la base).
   * En producción, podríamos preferir usar ACL="private" y luego presigned URLs.
   */
  async uploadFile(
    file: Express.Multer.File,
    folderName: string
  ): Promise<string> {
    const extension = file.originalname.split(".").pop();
    const key = `${folderName}/${Date.now()}-${randomUUID()}.${
      extension ?? "bin"
    }`;

    const params: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      await this.client.send(new PutObjectCommand(params));
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    } catch (error) {
      console.error("Error subiendo a S3:", error);
      throw new InternalServerErrorException(
        "No se pudo subir la imagen a S3"
      );
    }
  }

  /**
   * Genera una URL firmada (presigned) para que el frontend pueda obtenerla sin exponerla públicamente.
   * Por defecto, expira en 1 hora (3600 segundos).
   */
  async getPresignedUrl(
    key: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    try {

      const getObjectParams = {
        Bucket: this.bucketName,
        Key: key,
      };
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const command = new GetObjectCommand(getObjectParams);

      const url = await getSignedUrl(this.client, command, {
        expiresIn: expiresInSeconds,
      });
      return url;
    } catch (err) {
      console.error("Error generando presigned URL:", err);
      throw new InternalServerErrorException(
        "No se pudo generar la URL firmada"
      );
    }
  }
}
