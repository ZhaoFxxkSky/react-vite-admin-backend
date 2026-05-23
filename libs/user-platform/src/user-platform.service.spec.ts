import { Test, TestingModule } from '@nestjs/testing';
import { UserPlatformService } from './user-platform.service';

describe('UserPlatformService', () => {
  let service: UserPlatformService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserPlatformService],
    }).compile();

    service = module.get<UserPlatformService>(UserPlatformService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
