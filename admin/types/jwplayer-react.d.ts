// jwplayer-react.d.ts

/**
 * Khai báo module cho thư viện @jwplayer/jwplayer-react
 * Điều này cho TypeScript biết rằng khi bạn import module này, 
 * nó sẽ export một component React hợp lệ.
 * * NOTE: Bạn có thể cần định nghĩa chi tiết hơn về các Props (JWPlayerProps)
 * nếu muốn kiểm tra kiểu nghiêm ngặt hơn, nhưng khai báo này sẽ loại bỏ lỗi 7016.
 */
declare module '@jwplayer/jwplayer-react' {
    import * as React from 'react';

    // Định nghĩa các props cơ bản để TypeScript biết component nhận những gì
    interface JWPlayerProps extends React.ComponentPropsWithoutRef<'div'> {
        playerId: string;
        playlist: string | object | any[];
        config?: Record<string, any>;
        onReady?: (playerInstance: any) => void;
        // Thêm các event handlers khác nếu cần (onPlay, onPause, v.v.)
    }

    const JWPlayer: React.FC<JWPlayerProps>;
    export default JWPlayer;
}