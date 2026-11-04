import PaymentVerifyClient from "./verify-client";

export default async function PaymentVerifyPage({
  searchParams
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const params = await searchParams;
  return <PaymentVerifyClient reference={params.reference || params.trxref || ""} />;
}
