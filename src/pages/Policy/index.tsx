import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { isZaloMiniApp } from '../../services/zalo-env';
import { formatCalendarDate } from '../../utils/datetime';
import {
  ABOUT_BASE_PATH,
  DEFAULT_POLICY_ICON,
  POLICY_ICONS,
  POLICY_SLUGS,
  policyPath,
} from '../../constants/policy';
import {
  getPolicyDocument,
  getPolicyDocuments,
  type PolicyDocument,
  type PolicyDocumentSummary,
} from '../../services/policy.service';
import styles from './styles.module.css';

type PolicyLoadState =
  | { slug: string; status: 'loading'; document: null }
  | { slug: string; status: 'ready'; document: PolicyDocument }
  | { slug: string; status: 'not-found' | 'error'; document: null };

/**
 * Liên kết trong nội dung văn bản. Khai báo ngoài component để không tạo lại object mỗi lần
 * render — ReactMarkdown coi `components` đổi là phải dựng lại toàn bộ cây.
 *
 * Nội dung trong DB trỏ tới nhau bằng đường dẫn nội bộ (`[Chính sách bảo mật](/about/privacy)`).
 * Mặc định ReactMarkdown sinh ra thẻ `<a>` trơn mà router không biết tới, dẫn tới hai vấn đề:
 * bấm vào là tải lại cả bundle, và trong Zalo Mini App (router chạy với basename
 * `/zapps/<id>`) thì href tuyệt đối từ gốc domain làm người dùng văng khỏi mini app.
 *
 * Vẫn phải là thẻ `<a>` thật — `<Link>` render ra `<a>` nên giữ được bấm chuột giữa mở tab mới,
 * copy link, và SEO đọc được; chuyển sang `useNavigate` là mất hết những thứ đó.
 */
const MARKDOWN_COMPONENTS: Components = {
  a({ href, title, children }) {
    if (href?.startsWith('/')) {
      return (
        <Link to={href} title={title}>
          {children}
        </Link>
      );
    }

    // http(s) mở tab mới; mailto/tel/neo trong trang giữ hành vi mặc định của trình duyệt.
    const opensNewTab = /^https?:\/\//i.test(href ?? '');
    return (
      <a href={href} title={title} {...(opensNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  },
};

/**
 * Trang "Về chúng tôi": phần giới thiệu Tutora và toàn bộ văn bản pháp lý nằm chung một
 * layout, chuyển qua lại bằng sidebar bên trái.
 *
 * Mỗi văn bản VẪN giữ URL riêng (/about/<slug>) chứ không gộp thành một trang: ô tick đồng ý
 * ở đăng ký/đặt lịch/thanh toán/rút tiền link thẳng vào từng văn bản cụ thể, và văn bản pháp
 * lý phải trích dẫn được khi có tranh chấp. Sidebar chỉ là layout dùng chung bọc bên ngoài.
 *
 * Danh sách sidebar lấy từ API nên văn bản admin thêm qua CMS tự xuất hiện, không cần deploy lại.
 */
const PolicyPage = () => {
  const { slug: slugParam } = useParams<{ slug: string }>();
  // Không có param nghĩa là đang ở /about — mặc định mở văn bản giới thiệu.
  const slug = slugParam ?? POLICY_SLUGS.about;
  const inMiniApp = isZaloMiniApp();

  const [documents, setDocuments] = useState<PolicyDocumentSummary[]>([]);
  const [documentState, setDocumentState] = useState<PolicyLoadState>({
    slug,
    status: 'loading',
    document: null,
  });

  // Danh sách chỉ đổi khi admin thêm/gỡ văn bản — tải một lần, không tải lại mỗi lần đổi mục.
  useEffect(() => {
    let cancelled = false;
    getPolicyDocuments()
      .then((items) => {
        if (!cancelled) setDocuments(items);
      })
      .catch(() => {
        // Mất sidebar thì vẫn đọc được văn bản đang mở — không coi là lỗi chặn.
        if (!cancelled) setDocuments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getPolicyDocument(slug)
      .then((document) => {
        if (cancelled) return;
        setDocumentState(
          document
            ? { slug, status: 'ready', document }
            : { slug, status: 'not-found', document: null },
        );
      })
      .catch(() => {
        if (!cancelled) setDocumentState({ slug, status: 'error', document: null });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Cuộn lên đầu khi đổi văn bản: đang đọc giữa một điều khoản dài mà bấm sang mục khác,
  // trình duyệt giữ nguyên vị trí cuộn sẽ rơi vào giữa nội dung mới.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  const stateMatchesSlug = documentState.slug === slug;
  const activeDoc = stateMatchesSlug ? documentState.document : null;
  const loading = !stateMatchesSlug || documentState.status === 'loading';
  const notFound = stateMatchesSlug && documentState.status === 'not-found';
  const loadError = stateMatchesSlug && documentState.status === 'error';
  const sidebarItems = documents.length > 0 ? documents : activeDoc ? [activeDoc] : [];
  const activeTitle = activeDoc?.title ?? documents.find((item) => item.slug === slug)?.title;

  const sidebarNav = (
    <ul className={styles.sidebarList}>
      {sidebarItems.map((item) => {
        const isActive = item.slug === slug;
        return (
          <li key={item.slug}>
            <Link
              to={policyPath(item.slug)}
              className={`${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {POLICY_ICONS[item.slug] ?? DEFAULT_POLICY_ICON}
              </span>
              {item.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {!inMiniApp && <Header />}

      <main className={`${styles.page} ${inMiniApp ? styles.pageMiniApp : ''}`}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Đường dẫn">
            <Link to="/">Trang chủ</Link>
            <span aria-hidden="true">›</span>
            {slug === POLICY_SLUGS.about ? (
              <span aria-current="page">Về chúng tôi</span>
            ) : (
              <>
                <Link to={ABOUT_BASE_PATH}>Về chúng tôi</Link>
                <span aria-hidden="true">›</span>
                <span aria-current="page">{activeTitle ?? '…'}</span>
              </>
            )}
          </nav>

          <div className={styles.layout}>
            <aside className={styles.sidebar}>
              <span className={styles.sidebarTitle}>Về chúng tôi</span>
              {sidebarNav}
            </aside>

            {/* Mobile: sidebar thu thành khối gập, mặc định đóng để nội dung không bị đẩy
                xuống quá sâu khi mở trang. */}
            <details key={slug} className={styles.sidebarMobile}>
              <summary>
                <span className="material-symbols-outlined" aria-hidden="true">
                  menu_book
                </span>
                {activeTitle ?? 'Chọn nội dung'}
              </summary>
              {sidebarNav}
            </details>

            <section className={styles.content}>
              {loading ? (
                <div className={styles.centerState}>Đang tải nội dung…</div>
              ) : notFound ? (
                <div className={styles.centerState}>
                  <p>Không tìm thấy nội dung này, hoặc văn bản chưa được phát hành.</p>
                  <Link to={ABOUT_BASE_PATH} className={styles.stateLink}>
                    Quay lại Về chúng tôi
                  </Link>
                </div>
              ) : loadError ? (
                <div className={styles.centerState}>
                  <p>Không tải được nội dung. Vui lòng thử lại sau ít phút.</p>
                </div>
              ) : activeDoc ? (
                <>
                  <header className={styles.head}>
                    <h1 className={styles.title}>{activeDoc.title}</h1>
                    {activeDoc.summary && <p className={styles.summary}>{activeDoc.summary}</p>}
                    {/* Không hiện phiên bản: admin không sửa được số này qua CMS nên nó đứng yên
                        ở 1.0, hiện ra chỉ gây hiểu sai là văn bản chưa từng được cập nhật.
                        Văn bản giới thiệu cũng không phải văn bản pháp lý nên không cần hiệu lực. */}
                    {slug !== POLICY_SLUGS.about && formatCalendarDate(activeDoc.effectiveDate) && (
                      <p className={styles.meta}>
                        Hiệu lực từ {formatCalendarDate(activeDoc.effectiveDate)}
                      </p>
                    )}
                  </header>

                  {/* `remarkBreaks`: admin soạn nội dung trong CMS bằng cách gõ chữ bình thường, nên
                      một lần Enter phải ra một dòng mới đúng như lúc họ gõ. Markdown mặc định nuốt
                      dấu xuống dòng đơn và dồn cả đoạn thành một khối liền. */}
                  <article className={styles.doc}>
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={MARKDOWN_COMPONENTS}>
                      {activeDoc.contentMarkdown}
                    </ReactMarkdown>
                  </article>
                </>
              ) : null}
            </section>
          </div>
        </div>
      </main>

      {!inMiniApp && <Footer />}
    </>
  );
};

export default PolicyPage;
