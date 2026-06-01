import styles from './styles.module.css';

const typingAvatar = 'https://www.figma.com/api/mcp/asset/0ff4008a-fd18-4174-9e83-f377eb2a5123';

const TypingIndicator = () => {
    return (
        <div className={styles.typingRow}>
            <img alt="" className={styles.messageBubbleAvatar} src={typingAvatar} />
            <div className={styles.typingBubble}>
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
            </div>
        </div>
    );
};

export default TypingIndicator;
