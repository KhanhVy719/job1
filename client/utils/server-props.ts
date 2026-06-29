import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { encryptData } from './security';

// Hàm này sẽ bao bọc logic lấy data của bạn
export const withEncryptedProps = (handler: GetServerSideProps) => {
  return async (context: GetServerSidePropsContext) => {
    // 1. Chạy logic lấy data gốc
    const result = await handler(context);

    // 2. Nếu kết quả có props, tiến hành mã hóa
    if ('props' in result) {
      // Lấy props gốc (phải chờ nếu là Promise)
      const props = await Promise.resolve(result.props);
      
      // Mã hóa toàn bộ props thành 1 chuỗi duy nhất
      const encrypted = encryptData(props);

      // Trả về props mới chỉ chứa chuỗi mã hóa
      return {
        ...result,
        props: {
          __e: encrypted, // __e là viết tắt của encrypted
        },
      };
    }

    // Nếu là redirect hoặc notFound thì giữ nguyên
    return result;
  };
};