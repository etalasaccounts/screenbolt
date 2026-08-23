import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Screenbolt";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#f5f5f2",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "32px",
        }}
      >
        <div
          style={{
            fontSize: "72px",
            fontWeight: "700",
            color: "#090b0c",
            textAlign: "center",
          }}
        >
          Screenbolt
        </div>
        <div
          style={{
            fontSize: "32px",
            color: "#090b0c",
            textAlign: "center",
          }}
        >
          Record your screen and share it in seconds.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
