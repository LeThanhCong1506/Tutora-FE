import type { PolicyDocSlug } from '../../../constants/policy';
import type { PolicyDoc } from './types';

/**
 * Nội dung ba văn bản chính sách.
 *
 * ⚠️ CHƯA QUA RÀ SOÁT PHÁP LÝ. Các con số và quy trình dưới đây được viết bám theo hành vi
 * thật của hệ thống (xem tham chiếu trong từng mục), nên đúng về mặt kỹ thuật — nhưng câu chữ
 * ràng buộc, phần giới hạn trách nhiệm và điều khoản giải quyết tranh chấp cần luật sư duyệt
 * trước khi phát hành thật.
 *
 * Khi đổi logic ở backend thì sửa luôn ở đây, nếu không văn bản sẽ nói sai về sản phẩm:
 *  - Phí dịch vụ: MV.ApplicationLayer/Helpers/BookingFeeCalculator.cs
 *  - Cọc / phần còn lại: BookingFeeCalculator.CalculatePaymentPhases
 *  - Tự đóng phòng học: ClassSessionService.M3.Attendance.cs (LiveSessionAutoEndGraceMinutes)
 *  - Đổi lịch: ClassSessionRescheduleProposalService.cs (MinHoursBeforeOriginalStart)
 *  - Mức hoàn khi khiếu nại: DTO/RequestModel/ResolveDisputeRequest.cs (ResolutionTypes)
 *  - Ngưỡng OTP giao dịch lớn: MV.DomainLayer/Constants/LargeTransactionPolicy.cs
 */
export const POLICY_DOCS: Record<PolicyDocSlug, PolicyDoc> = {
  terms: {
    title: 'Điều khoản sử dụng',
    summary:
      'Các điều kiện khi bạn tạo tài khoản và sử dụng nền tảng Tutora, dù với vai trò phụ huynh, học viên hay gia sư.',
    sections: [
      {
        id: 'chap-nhan',
        heading: '1. Chấp nhận điều khoản',
        paragraphs: [
          'Khi tạo tài khoản, đặt lịch học hoặc sử dụng bất kỳ tính năng nào của Tutora, bạn xác nhận đã đọc, hiểu và đồng ý với Điều khoản sử dụng này cùng Chính sách bảo mật và Quy chế hoạt động đi kèm.',
          'Nếu bạn chưa đủ 16 tuổi, bạn chỉ được sử dụng nền tảng thông qua tài khoản do cha mẹ hoặc người giám hộ tạo và quản lý.',
        ],
      },
      {
        id: 'vai-tro',
        heading: '2. Vai trò của Tutora',
        paragraphs: [
          'Tutora là nền tảng trung gian kết nối phụ huynh, học viên với gia sư. Chúng tôi cung cấp công cụ tìm kiếm, đặt lịch, lớp học trực tuyến, thanh toán và xử lý khiếu nại.',
          'Tutora không phải là bên trực tiếp giảng dạy. Chất lượng chuyên môn của buổi học thuộc trách nhiệm của gia sư. Đổi lại, Tutora kiểm duyệt hồ sơ, giữ tiền qua tài khoản tạm giữ cho tới khi buổi học hoàn tất, và đứng ra phân xử khi hai bên phát sinh tranh chấp.',
        ],
      },
      {
        id: 'tai-khoan',
        heading: '3. Tài khoản và xác thực',
        paragraphs: [
          'Bạn có thể đăng ký bằng email và mật khẩu, hoặc bằng tài khoản mạng xã hội được hỗ trợ. Một số thao tác yêu cầu xác minh số điện thoại trước khi thực hiện.',
        ],
        bullets: [
          'Bạn chịu trách nhiệm về mọi hoạt động phát sinh dưới tài khoản của mình.',
          'Thông tin khai báo phải chính xác; khai sai để vượt qua kiểm duyệt là căn cứ để khoá tài khoản.',
          'Không chia sẻ tài khoản cho người khác, không tạo nhiều tài khoản để lách các giới hạn của hệ thống.',
          'Thông báo cho chúng tôi ngay khi phát hiện tài khoản bị truy cập trái phép.',
        ],
      },
      {
        id: 'gia-su',
        heading: '4. Điều kiện riêng với gia sư',
        paragraphs: [
          'Hồ sơ gia sư chỉ hiển thị công khai sau khi được quản trị viên duyệt. Bằng cấp, chứng chỉ và các thông tin năng lực khác phải là tài liệu thật của chính bạn.',
          'Mọi thay đổi quan trọng trên hồ sơ đã duyệt (môn dạy, học phí, thông tin năng lực) đều đi qua một vòng duyệt lại trước khi hiển thị.',
        ],
        bullets: [
          'Dạy đúng lịch đã nhận, đúng môn và khối lớp đã đăng ký.',
          'Gửi báo cáo sau mỗi buổi học — đây là căn cứ để buổi học được ghi nhận hoàn tất và tiền được giải ngân.',
          'Không đưa thông tin liên hệ riêng để đưa giao dịch ra ngoài nền tảng.',
        ],
      },
      {
        id: 'noi-dung',
        heading: '5. Nội dung do người dùng đăng tải',
        paragraphs: [
          'Bạn giữ quyền với nội dung mình đăng (hồ sơ, tin nhắn, báo cáo buổi học, tài liệu đính kèm, đánh giá). Đồng thời bạn cho phép Tutora lưu trữ và hiển thị nội dung đó trong phạm vi vận hành nền tảng.',
          'Nội dung đăng tải được hệ thống kiểm duyệt tự động. Nội dung vi phạm pháp luật, xúc phạm, quấy rối, hoặc nhằm đưa giao dịch ra ngoài nền tảng sẽ bị gỡ.',
        ],
      },
      {
        id: 'hanh-vi-cam',
        heading: '6. Hành vi bị cấm',
        bullets: [
          'Đưa giao dịch ra ngoài nền tảng để né phí dịch vụ.',
          'Cung cấp thông tin, bằng cấp hoặc bằng chứng giả trong hồ sơ và trong khiếu nại.',
          'Quấy rối, phân biệt đối xử hoặc có hành vi không phù hợp với học viên.',
          'Ghi hình, ghi âm, phát tán nội dung buổi học ra ngoài khi chưa được các bên đồng ý.',
          'Can thiệp kỹ thuật vào hệ thống, dò quét, hoặc thu thập dữ liệu người dùng tự động.',
        ],
      },
      {
        id: 'xu-ly-vi-pham',
        heading: '7. Cảnh báo và đình chỉ tài khoản',
        paragraphs: [
          'Tuỳ mức độ, Tutora có thể gửi cảnh báo, hạn chế một phần tính năng, đình chỉ có thời hạn hoặc khoá vĩnh viễn tài khoản. Các khoản tiền đang trong tài khoản tạm giữ được xử lý theo Quy chế hoạt động, không bị mất khi tài khoản bị đình chỉ.',
        ],
      },
      {
        id: 'so-huu-tri-tue',
        heading: '8. Sở hữu trí tuệ',
        paragraphs: [
          'Giao diện, mã nguồn, thương hiệu và tài liệu do Tutora tạo ra thuộc quyền sở hữu của Tutora. Bạn không được sao chép, phân phối lại hoặc tạo sản phẩm phái sinh nếu không có văn bản cho phép.',
        ],
      },
      {
        id: 'gioi-han-trach-nhiem',
        heading: '9. Giới hạn trách nhiệm',
        paragraphs: [
          'Tutora nỗ lực duy trì dịch vụ ổn định nhưng không cam kết nền tảng hoạt động không gián đoạn. Với sự cố kỹ thuật khiến buổi học không diễn ra được, hướng xử lý là học bù hoặc hoàn tiền theo Quy chế hoạt động.',
          'Tutora không chịu trách nhiệm cho các thoả thuận riêng giữa phụ huynh và gia sư nằm ngoài nền tảng.',
        ],
      },
      {
        id: 'thay-doi',
        heading: '10. Thay đổi điều khoản',
        paragraphs: [
          'Chúng tôi có thể cập nhật điều khoản khi sản phẩm hoặc quy định pháp luật thay đổi. Bản cập nhật được đăng tại trang này kèm ngày hiệu lực mới. Tiếp tục sử dụng nền tảng sau ngày hiệu lực được hiểu là bạn chấp nhận bản mới.',
        ],
      },
      {
        id: 'lien-he-dieu-khoan',
        heading: '11. Liên hệ',
        paragraphs: [
          'Mọi câu hỏi về điều khoản, vui lòng liên hệ bộ phận hỗ trợ của Tutora qua kênh hỗ trợ trong ứng dụng.',
        ],
      },
    ],
  },

  'operating-rules': {
    title: 'Quy chế hoạt động',
    summary:
      'Cách nền tảng vận hành trên thực tế: đặt lịch, phí dịch vụ, thanh toán theo giai đoạn, buổi học trực tuyến, đổi lịch, khiếu nại và rút tiền.',
    sections: [
      {
        id: 'quy-trinh-dat-lich',
        heading: '1. Quy trình đặt lịch',
        paragraphs: [
          'Phụ huynh hoặc học viên chọn gia sư, chọn khung giờ trong lịch rảnh mà gia sư đã công bố, rồi gửi yêu cầu đặt lịch. Yêu cầu chỉ trở thành lịch học chính thức sau khi gia sư xác nhận.',
          'Nếu gia sư không phản hồi trong thời hạn quy định, yêu cầu tự hết hiệu lực và bạn không bị trừ tiền.',
        ],
      },
      {
        id: 'phi-dich-vu',
        heading: '2. Phí dịch vụ',
        paragraphs: [
          'Tutora thu phí dịch vụ trên cả hai phía của một giao dịch, mỗi phía 5% học phí gốc:',
        ],
        bullets: [
          'Phụ huynh thanh toán học phí gốc cộng thêm 5% phí dịch vụ.',
          'Gia sư nhận học phí gốc trừ đi 5% phí dịch vụ.',
          'Ví dụ với học phí gốc 100.000đ: phụ huynh trả 105.000đ, gia sư nhận 95.000đ.',
        ],
      },
      {
        id: 'thanh-toan',
        heading: '3. Thanh toán theo giai đoạn',
        paragraphs: [
          'Với gói nhiều buổi, tiền được chia làm hai lần thu. Lần đầu là khoản đặt cọc tương đương giá một buổi học, đóng trước khi buổi đầu tiên diễn ra. Phần còn lại được thu sau đó theo tiến trình lớp học.',
          'Với booking chỉ một buổi, toàn bộ số tiền được thu ngay từ đầu.',
          'Chưa hoàn tất nghĩa vụ thanh toán thì các buổi tiếp theo sẽ không được điểm danh, dù cả hai bên đã vào phòng học.',
        ],
      },
      {
        id: 'tam-giu',
        heading: '4. Tài khoản tạm giữ và giải ngân',
        paragraphs: [
          'Tiền phụ huynh thanh toán không chuyển thẳng cho gia sư mà được giữ ở tài khoản tạm giữ của nền tảng. Hệ thống giải ngân theo từng buổi: buổi nào được ghi nhận hoàn tất thì phần tiền tương ứng của buổi đó mới về ví gia sư.',
          'Cơ chế này để đảm bảo cả hai phía: phụ huynh không mất tiền cho buổi chưa học, gia sư không dạy xong mà không được trả.',
        ],
      },
      {
        id: 'buoi-hoc',
        heading: '5. Buổi học trực tuyến',
        paragraphs: [
          'Buổi học diễn ra trong phòng học trực tuyến của nền tảng. Hệ thống tự điểm danh khi cả gia sư và học viên cùng có mặt trong phòng — một phía có mặt là chưa đủ.',
        ],
        bullets: [
          'Phòng học tự đóng sau 30 phút kể từ giờ kết thúc dự kiến nếu gia sư chưa chủ động kết thúc.',
          'Buổi học có thể được ghi hình để làm bằng chứng khi phát sinh khiếu nại.',
          'Sau buổi học, gia sư gửi báo cáo nội dung đã dạy. Buổi học chỉ được ghi nhận hoàn tất sau bước này.',
        ],
      },
      {
        id: 'doi-lich',
        heading: '6. Đổi lịch',
        paragraphs: [
          'Hai bên có thể thoả thuận dời một buổi học sang khung giờ khác. Đề xuất đổi lịch phải được gửi chậm nhất 2 giờ trước giờ học đã đặt, và chỉ có hiệu lực khi phía còn lại đồng ý.',
          'Quá mốc này, buổi học giữ nguyên lịch cũ; nếu một bên không tham gia thì xử lý theo mục vắng mặt.',
        ],
      },
      {
        id: 'vang-mat',
        heading: '7. Vắng mặt',
        paragraphs: [
          'Khi một bên không có mặt, bên còn lại có thể báo vắng mặt kèm bằng chứng. Hệ thống đối chiếu nhật ký hiện diện trong phòng học để xác minh.',
          'Hai hướng xử lý: bố trí học bù, hoặc hoàn 100% học phí của buổi đó cho phụ huynh.',
        ],
      },
      {
        id: 'khieu-nai',
        heading: '8. Khiếu nại và hoàn tiền',
        paragraphs: [
          'Khi không hài lòng về một buổi học, phụ huynh có thể mở khiếu nại kèm mô tả và bằng chứng. Gia sư được quyền phản hồi. Quản trị viên xem xét cả hai phía cùng bằng chứng hệ thống (nhật ký hiện diện, bản ghi buổi học, tin nhắn trong lớp) rồi ra quyết định.',
          'Các mức xử lý gồm: giải ngân đầy đủ cho gia sư, hoàn 50% cho phụ huynh, hoàn 100% cho phụ huynh, hoặc một tỷ lệ khác do quản trị viên ấn định tuỳ tình huống.',
          'Tiền của buổi đang bị khiếu nại được giữ nguyên ở tài khoản tạm giữ cho tới khi có quyết định.',
        ],
      },
      {
        id: 'rut-tien',
        heading: '9. Rút tiền',
        paragraphs: [
          'Gia sư rút tiền từ ví về tài khoản ngân hàng đã đăng ký và xác minh. Chỉ phần số dư khả dụng mới rút được — tiền đang bị giữ cho các buổi chưa hoàn tất thì chưa.',
        ],
        bullets: [
          'Yêu cầu rút tiền được quản trị viên đối soát trước khi chi.',
          'Giao dịch từ 2.000.000đ trở lên cần xác thực thêm bằng mã OTP.',
          'Tên chủ tài khoản ngân hàng phải trùng với tên trên hồ sơ đã xác minh.',
        ],
      },
      {
        id: 'thue',
        heading: '10. Nghĩa vụ thuế',
        paragraphs: [
          'Thu nhập của gia sư trên nền tảng thuộc diện chịu thuế thu nhập cá nhân theo quy định hiện hành. Tutora thực hiện khấu trừ và kê khai theo đúng quy định, đồng thời cung cấp chứng từ khấu trừ khi bạn yêu cầu.',
        ],
      },
      {
        id: 'thay-doi-quy-che',
        heading: '11. Thay đổi quy chế',
        paragraphs: [
          'Mức phí, mốc thời gian và quy trình nêu trên có thể được điều chỉnh. Thay đổi sẽ được thông báo trước và không áp dụng hồi tố cho các booking đã thanh toán.',
        ],
      },
    ],
  },

  privacy: {
    title: 'Chính sách bảo mật',
    summary:
      'Chúng tôi thu thập dữ liệu gì, dùng để làm gì, chia sẻ với ai, và bạn kiểm soát dữ liệu của mình ra sao.',
    sections: [
      {
        id: 'du-lieu-thu-thap',
        heading: '1. Dữ liệu chúng tôi thu thập',
        paragraphs: ['Tuỳ vai trò và tính năng bạn dùng, hệ thống lưu các nhóm dữ liệu sau:'],
        bullets: [
          'Thông tin tài khoản: họ tên, email, số điện thoại, ảnh đại diện, vai trò.',
          'Hồ sơ gia sư: học vấn, kinh nghiệm, bằng cấp và chứng chỉ tải lên để kiểm duyệt.',
          'Thông tin học viên do phụ huynh khai báo: tên, khối lớp, môn cần học.',
          'Dữ liệu giao dịch: lịch sử đặt lịch, thanh toán, ví, yêu cầu rút tiền, thông tin tài khoản ngân hàng.',
          'Dữ liệu buổi học: nhật ký ra vào phòng, tin nhắn trong lớp, ghi chú, báo cáo, tài liệu đính kèm và bản ghi hình buổi học.',
          'Dữ liệu kỹ thuật: thiết bị, trình duyệt, thời điểm truy cập — dùng để bảo mật và xử lý sự cố.',
        ],
      },
      {
        id: 'theo-doi-tap-trung',
        heading: '2. Tính năng theo dõi mức độ tập trung',
        paragraphs: [
          'Trong buổi học, gia sư có thể bật tính năng theo dõi mức độ tập trung của học viên. Chúng tôi muốn nói rõ cách nó hoạt động vì đây là tính năng nhạy cảm.',
          'Toàn bộ việc phân tích hình ảnh chạy ngay trên máy của học viên. Hình ảnh camera không được gửi lên máy chủ và không được lưu lại phục vụ tính năng này. Thứ duy nhất rời khỏi thiết bị là điểm số mức độ tập trung và nhãn trạng thái đã quy đổi.',
          'Tính năng chỉ chạy khi gia sư chủ động bật và camera học viên đang mở. Tắt camera là dừng.',
        ],
      },
      {
        id: 'muc-dich',
        heading: '3. Mục đích sử dụng',
        bullets: [
          'Vận hành dịch vụ: tạo tài khoản, ghép nối gia sư, tổ chức buổi học, thanh toán.',
          'Kiểm duyệt hồ sơ gia sư và bảo đảm an toàn cho học viên.',
          'Làm căn cứ khi xử lý khiếu nại và tranh chấp giữa hai bên.',
          'Gửi thông báo về lịch học, thanh toán và các thay đổi liên quan tới tài khoản.',
          'Thực hiện nghĩa vụ kế toán, thuế và các yêu cầu hợp pháp của cơ quan nhà nước.',
        ],
      },
      {
        id: 'chia-se',
        heading: '4. Chia sẻ dữ liệu',
        paragraphs: [
          'Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ trong các trường hợp cần thiết để dịch vụ chạy được:',
        ],
        bullets: [
          'Giữa các bên trong một buổi học: gia sư thấy thông tin học viên mình dạy và ngược lại.',
          'Nhà cung cấp hạ tầng phục vụ lớp học trực tuyến, lưu trữ tệp và bản ghi.',
          'Cổng thanh toán, để xử lý giao dịch nạp và rút tiền.',
          'Kênh gửi thông báo tới điện thoại và email của bạn.',
          'Cơ quan nhà nước có thẩm quyền, khi có yêu cầu hợp pháp.',
        ],
      },
      {
        id: 'luu-tru',
        heading: '5. Lưu trữ và bảo mật',
        paragraphs: [
          'Dữ liệu được truyền qua kết nối mã hoá. Mật khẩu không được lưu ở dạng đọc được. Quyền truy cập dữ liệu nội bộ được phân theo vai trò, và các thao tác nhạy cảm như đối soát rút tiền đều để lại vết trong nhật ký hệ thống.',
          'Dữ liệu giao dịch được giữ theo thời hạn mà pháp luật về kế toán và thuế yêu cầu, kể cả sau khi bạn đóng tài khoản.',
        ],
      },
      {
        id: 'quyen-nguoi-dung',
        heading: '6. Quyền của bạn',
        bullets: [
          'Xem và chỉnh sửa thông tin cá nhân trong phần tài khoản.',
          'Yêu cầu bản sao dữ liệu của mình.',
          'Yêu cầu xoá tài khoản, trừ phần dữ liệu buộc phải lưu theo quy định pháp luật hoặc đang là bằng chứng cho một khiếu nại chưa kết thúc.',
          'Từ chối nhận thông báo tiếp thị mà vẫn giữ được thông báo vận hành liên quan tới lịch học và thanh toán.',
        ],
      },
      {
        id: 'tre-em',
        heading: '7. Dữ liệu của trẻ em',
        paragraphs: [
          'Học viên dưới 16 tuổi tham gia thông qua tài khoản của cha mẹ hoặc người giám hộ. Người giám hộ là bên khai báo thông tin học viên, và là bên có quyền yêu cầu chỉnh sửa hoặc xoá dữ liệu đó.',
        ],
      },
      {
        id: 'ban-ghi-buoi-hoc',
        heading: '8. Bản ghi buổi học',
        paragraphs: [
          'Buổi học có thể được ghi hình. Khi đang ghi, giao diện phòng học hiển thị chỉ báo cho tất cả người tham gia.',
          'Bản ghi phục vụ hai mục đích: cho phụ huynh và học viên xem lại, và làm bằng chứng khi có khiếu nại. Chúng tôi không dùng bản ghi cho quảng cáo và không chia sẻ ra ngoài phạm vi những người tham gia buổi học đó cùng bộ phận xử lý khiếu nại.',
        ],
      },
      {
        id: 'thay-doi-chinh-sach',
        heading: '9. Thay đổi chính sách',
        paragraphs: [
          'Khi có thay đổi ảnh hưởng tới quyền của bạn, chúng tôi sẽ thông báo trước qua ứng dụng hoặc email trước ngày hiệu lực.',
        ],
      },
      {
        id: 'lien-he-bao-mat',
        heading: '10. Liên hệ',
        paragraphs: [
          'Nếu bạn có yêu cầu liên quan tới dữ liệu cá nhân, hãy liên hệ bộ phận hỗ trợ của Tutora qua kênh hỗ trợ trong ứng dụng.',
        ],
      },
    ],
  },
};
