import { Couple, UserId } from '../domain/schema';
import { ICoupleRepository, IUserRepository, ISyncEngine } from '../repositories/interfaces';

export class JoinCoupleUseCase {
    constructor(
        private coupleRepo: ICoupleRepository,
        private userRepo: IUserRepository,
        private syncEngine: ISyncEngine
    ) { }

    async execute(userId: string, inviteCode: string): Promise<Couple> {
        const uid = userId as UserId;

        let couple = await this.coupleRepo.getByInviteCode(inviteCode);

        // Cloud Fallback
        if (!couple) {

            const remoteCouple = await this.syncEngine.fetchCoupleByCode(inviteCode);
            if (remoteCouple) {
                // Save locally so we can proceed with logic
                await this.coupleRepo.create(remoteCouple);
                couple = remoteCouple;
            }
        }

        if (!couple) {
            throw new Error('Invalid invite code');
        }

        if (couple.status !== 'pending' && couple.status !== 'active') {
            if (couple.userBId) {
                throw new Error('Couple is already full');
            }
        }

        if (couple.userAId === uid) {
            throw new Error('Cannot join your own couple as partner');
        }

        const user = await this.userRepo.getById(uid);
        if (!user) throw new Error('User not found');
        if (user.coupleId) {
            throw new Error('User is already in a couple');
        }

        const updatedCouple: Couple = {
            ...couple,
            userBId: uid,
            status: 'active'
        };

        const updatedUser = {
            ...user,
            coupleId: updatedCouple.id
        };

        await this.coupleRepo.update(updatedCouple);
        await this.userRepo.create(updatedUser);

        await this.syncEngine.enqueueAction('JOIN_COUPLE', updatedCouple);

        return updatedCouple;
    }
}
