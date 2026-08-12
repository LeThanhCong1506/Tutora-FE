import { Link, Navigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { isZaloMiniApp } from '../../services/zalo-env';
import {
  POLICY_DOC_LABELS,
  POLICY_DOC_SLUGS,
  POLICY_EFFECTIVE_DATE,
  POLICY_ROUTES,
  POLICY_VERSION,
  type PolicyDocSlug,
} from '../../constants/policy';
import { POLICY_DOCS } from './policy-components';
import styles from './styles.module.css';

/**
 * Mỗi văn bản là một route tĩnh riêng (/terms, /privacy, ...) chứ không phải `/policy/:doc`,
 * nên slug được suy ngược từ pathname thay vì đọc route param.
 */
const slugFromPathname = (pathname: string): PolicyDocSlug | null =>
  POLICY_DOC_SLUGS.find((slug) => POLICY_ROUTES[slug] === pathname) ?? null;

/**
 * Trang hiển thị ba văn bản chính sách. Một component dùng chung cho cả ba route
 * (/terms, /privacy, /operating-rules) — mỗi văn bản giữ URL riêng để còn chia sẻ
 * và trích dẫn được, thay vì gộp thành tab trong một URL.
 *
 * Trong Zalo Mini App không có Header/Footer web: hai thành phần đó chứa điều hướng
 * của bản web, hiện trong mini app sẽ lệch hẳn khỏi khung giao diện của Zalo.
 */
const PolicyPage = () => {
  const { pathname } = useLocation();
  const inMiniApp = isZaloMiniApp();
  const doc = slugFromPathname(pathname);

  // Route khai báo tĩnh nên luôn khớp; nhánh này phòng trường hợp đổi path ở App.tsx
  // mà quên sửa POLICY_ROUTES — thà về Điều khoản còn hơn màn hình trắng.
  if (!doc) {
    return <Navigate to={POLICY_ROUTES.terms} replace />;
  }

  const activeDoc = POLICY_DOCS[doc];

  return (
    <>
      {!inMiniApp && <Header />}

      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.head}>
            <span className={styles.eyebrow}>Văn bản pháp lý</span>
            <h1 className={styles.title}>{activeDoc.title}</h1>
            <p className={styles.summary}>{activeDoc.summary}</p>
            <p className={styles.meta}>
              Phiên bản {POLICY_VERSION} · Hiệu lực từ {POLICY_EFFECTIVE_DATE}
            </p>
          </header>

          <nav className={styles.docNav} aria-label="Các văn bản chính sách">
            {POLICY_DOC_SLUGS.map((slug) => (
              <Link
                key={slug}
                to={POLICY_ROUTES[slug]}
                className={`${styles.docNavItem} ${slug === doc ? styles.docNavItemActive : ''}`}
                aria-current={slug === doc ? 'page' : undefined}
              >
                {POLICY_DOC_LABELS[slug]}
              </Link>
            ))}
          </nav>

          <div className={styles.body}>
            <aside className={styles.tocWrap}>
              <nav className={styles.toc} aria-label={`Mục lục ${activeDoc.title}`}>
                <span className={styles.tocTitle}>Nội dung</span>
                <ol className={styles.tocList}>
                  {activeDoc.sections.map((section) => (
                    <li key={section.id}>
                      <a href={`#${section.id}`}>{section.heading}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <article className={styles.doc}>
              {activeDoc.sections.map((section) => (
                <section key={section.id} id={section.id} className={styles.section}>
                  <h2 className={styles.sectionHeading}>{section.heading}</h2>
                  {section.paragraphs?.map((paragraph, index) => (
                    <p key={index} className={styles.paragraph}>
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className={styles.bullets}>
                      {section.bullets.map((bullet, index) => (
                        <li key={index}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </article>
          </div>
        </div>
      </main>

      {!inMiniApp && <Footer />}
    </>
  );
};

export default PolicyPage;
