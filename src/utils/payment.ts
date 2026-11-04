
import { supabase } from "../../supabase";

export type PaymentMethod =
  | "qris"
  | "bca"
  | "bri"
  | "mandiri";

export type BookingPayment = {
  id: string;
  amount_idr: number;
  status: string;
  payment_method: PaymentMethod | null;
  paid_at: string | null;
  nutritionist_name: string;
  specialty: string;
  duration: number;
  starts_at: string;
  ends_at: string;
};

export const methods: {
  id: PaymentMethod;
  name: string;
  subtitle: string;
  shortName: string;
}[] = [
  {
    id: "qris",
    name: "QRIS",
    subtitle: "QR demo untuk simulasi pembayaran",
    shortName: "QRIS",
  },
  {
    id: "bca",
    name: "Bank BCA",
    subtitle: "Virtual account simulasi",
    shortName: "BCA",
  },
  {
    id: "bri",
    name: "Bank BRI",
    subtitle: "BRIVA simulasi",
    shortName: "BRI",
  },
  {
    id: "mandiri",
    name: "Bank Mandiri",
    subtitle: "Livin' virtual account simulasi",
    shortName: "Mandiri",
  },
];

export function paymentMethodName(
  method: PaymentMethod | null
) {
  return (
    methods.find((item) => item.id === method)
      ?.name ?? "Belum dipilih"
  );
}

export function formatMoney(amount: number) {
  return `Rp${Number(amount).toLocaleString("id-ID")}`;
}

export async function getBookingPayment(
  bookingId: string
): Promise<BookingPayment> {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Silakan login kembali.");
  }

  // Booking hanya boleh milik pasien yang login
  const { data: booking, error: bookingError } =
    await supabase
      .from("consultation_bookings")
      .select(
        "id, amount_idr, status, payment_method, " +
        "paid_at, nutritionist_id, slot_id"
      )
      .eq("id", bookingId)
      .eq("patient_id", authData.user.id)
      .single();

  if (bookingError || !booking) {
    throw new Error(
      "Booking tidak ditemukan atau bukan milik akunmu."
    );
  }

  const [expertResult, slotResult] =
    await Promise.all([
      supabase
        .from("nutritionists")
        .select("display_name, specialty, session_minutes")
        .eq("id", booking.nutritionist_id)
        .single(),

      supabase
        .from("consultation_slots")
        .select("starts_at, ends_at")
        .eq("id", booking.slot_id)
        .single(),
    ]);

  if (expertResult.error) throw expertResult.error;
  if (slotResult.error) throw slotResult.error;

  if (!expertResult.data || !slotResult.data) {
    throw new Error(
      "Data ahli gizi atau jadwal belum ditemukan."
    );
  }

  return {
    id: booking.id,
    amount_idr: booking.amount_idr,
    status: booking.status,
    payment_method: booking.payment_method,
    paid_at: booking.paid_at,
    nutritionist_name:
      expertResult.data.display_name,
    specialty: expertResult.data.specialty,
    duration: expertResult.data.session_minutes,
    starts_at: slotResult.data.starts_at,
    ends_at: slotResult.data.ends_at,
  };
}
