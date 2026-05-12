import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../apps/user-service/src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/auth/login (POST) should return 401 without credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({})
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
