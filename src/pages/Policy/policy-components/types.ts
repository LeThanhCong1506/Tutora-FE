export interface PolicySection {
  /** Dùng làm anchor `#id` và key mục lục — giữ ổn định để link cũ không hỏng. */
  id: string;
  heading: string;
  /** Mỗi phần tử là một đoạn văn. */
  paragraphs?: string[];
  /** Danh sách gạch đầu dòng, hiện sau các đoạn văn. */
  bullets?: string[];
}

export interface PolicyDoc {
  title: string;
  /** Câu tóm tắt hiển thị ngay dưới tiêu đề. */
  summary: string;
  sections: PolicySection[];
}
