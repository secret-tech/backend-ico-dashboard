import { container } from '../../ioc.container';
import { expect } from 'chai';
import { StorageServiceType, StorageService } from '../storage.service';
import { UserServiceType, UserServiceInterface } from '../user.service';

const storageService = container.get<StorageService>(StorageServiceType);
const userService = container.get<UserServiceInterface>(UserServiceType);

describe('userService', () => {
});
