export const metadata = {
  title: "Chính sách quyền riêng tư — CRM Y tế",
};

export default function PrivacyPage() {
  return (
    <main style={{
      maxWidth:   780,
      margin:     "0 auto",
      padding:    "48px 24px 80px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color:      "#1F2937",
      lineHeight: 1.7,
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Chính sách quyền riêng tư
      </h1>
      <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 40 }}>
        Cập nhật lần cuối: 29 tháng 3 năm 2026
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>1. Giới thiệu</h2>
        <p>
          Chúng tôi là phòng khám y tế sử dụng hệ thống CRM nội bộ để quản lý
          thông tin liên lạc và hỗ trợ bệnh nhân qua các kênh nhắn tin (Facebook
          Messenger, Zalo và các nền tảng khác). Chính sách này mô tả cách chúng
          tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>2. Thông tin chúng tôi thu thập</h2>
        <p>Khi bạn liên hệ với chúng tôi qua các kênh nhắn tin, chúng tôi có thể thu thập:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Họ tên hiển thị trên hồ sơ mạng xã hội</li>
          <li>Ảnh đại diện công khai</li>
          <li>Ngôn ngữ và giới tính (nếu được công khai)</li>
          <li>Nội dung tin nhắn bạn gửi cho chúng tôi</li>
          <li>Thời gian liên hệ</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Chúng tôi <strong>không</strong> thu thập mật khẩu, thông tin thẻ tín dụng
          hoặc bất kỳ thông tin nhạy cảm nào khác qua kênh nhắn tin.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>3. Mục đích sử dụng thông tin</h2>
        <p>Thông tin thu thập được sử dụng để:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Trả lời câu hỏi, tư vấn và hỗ trợ đặt lịch khám</li>
          <li>Quản lý lịch sử liên lạc trong hệ thống nội bộ</li>
          <li>Cải thiện chất lượng dịch vụ chăm sóc bệnh nhân</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Chúng tôi <strong>không</strong> bán, cho thuê hoặc chia sẻ thông tin
          cá nhân của bạn với bên thứ ba cho mục đích thương mại.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>4. Lưu trữ và bảo mật</h2>
        <p>
          Dữ liệu được lưu trữ trên máy chủ nội bộ, chỉ nhân viên có thẩm quyền
          mới có quyền truy cập. Chúng tôi áp dụng các biện pháp bảo mật hợp lý
          để bảo vệ thông tin khỏi truy cập trái phép, mất mát hoặc tiết lộ.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>5. Quyền của bạn</h2>
        <p>Bạn có quyền:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Yêu cầu xem thông tin chúng tôi lưu trữ về bạn</li>
          <li>Yêu cầu chỉnh sửa thông tin không chính xác</li>
          <li>Yêu cầu xóa thông tin cá nhân của bạn khỏi hệ thống</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Để thực hiện các quyền trên, vui lòng liên hệ trực tiếp với phòng khám.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>6. Tích hợp Facebook</h2>
        <p>
          Hệ thống của chúng tôi sử dụng Facebook Messenger API để nhận và gửi
          tin nhắn. Việc sử dụng Facebook tuân theo{" "}
          <a
            href="https://www.facebook.com/privacy/policy/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#3B82F6" }}
          >
            Chính sách quyền riêng tư của Meta
          </a>
          . Chúng tôi chỉ yêu cầu các quyền cần thiết tối thiểu để vận hành
          dịch vụ hỗ trợ bệnh nhân.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>7. Thay đổi chính sách</h2>
        <p>
          Chúng tôi có thể cập nhật chính sách này theo thời gian. Mọi thay đổi
          sẽ được đăng tải tại trang này kèm ngày cập nhật.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>8. Liên hệ</h2>
        <p>
          Nếu có thắc mắc về chính sách quyền riêng tư, vui lòng liên hệ với
          chúng tôi qua Facebook Page hoặc trực tiếp tại phòng khám.
        </p>
      </section>
    </main>
  );
}
