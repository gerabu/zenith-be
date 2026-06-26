import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

const SWAGGER_PATH = 'docs';

// Mounts Swagger UI behind HTTP Basic Auth. Fail-closed: without both
// credentials the docs (and the raw /docs-json spec) are never exposed.
function setupSwagger(app: INestApplication): void {
  const user = process.env.SWAGGER_USER;
  const password = process.env.SWAGGER_PASSWORD;
  if (!user || !password) {
    return;
  }

  app.use(
    [`/${SWAGGER_PATH}`, `/${SWAGGER_PATH}-json`],
    basicAuth({ users: { [user]: password }, challenge: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('Zenith API')
    .setDescription(
      'Google Calendar booking API. Every response uses the envelope ' +
        '`{ success, data }` on success or `{ success, error }` on failure.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
