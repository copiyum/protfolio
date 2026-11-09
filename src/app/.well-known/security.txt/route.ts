export const dynamic = "force-static";

export async function GET() {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  const body = [
    `Contact: mailto:sarangsudhir.personal@gmail.com`,
    `Preferred-Languages: en`,
    `Canonical: https://sarang.dev/.well-known/security.txt`,
    `Policy: https://sarang.dev/privacy`,
    `Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, "Z")}`,
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
