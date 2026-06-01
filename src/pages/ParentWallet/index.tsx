import styles from './styles.module.css';
import PaymentRequestsCard from './PaymentRequestsCard';
import QuickTopUpCard from './QuickTopUpCard';
import RecentTransactionsCard from './RecentTransactionsCard';
import WalletBalanceHeroCard from './WalletBalanceHeroCard';

const ParentWallet = () => {
    return (
        <div className={styles.page}>
            <WalletBalanceHeroCard />
            <QuickTopUpCard />
            <PaymentRequestsCard />
            <RecentTransactionsCard />
        </div>
    );
};

export default ParentWallet;
