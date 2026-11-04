
import { supabase } from "../../supabase";

export type ConsultStatus =
  | "pending_payment"
  | "paid_simulated"
  | "completed"
  | "cancelled";

export type ConsultBooking = {
  id: string;
  status: ConsultStatus;
  amount_idr: number;
  expert: {
    display_name: string;
    specialty: string;
    photo_key: "female" | "male";
    is_demo: boolean;
    account_id: string | null;
  } | null;
  slot: {
    starts_at: string;
    ends_at: string;
  } | null;
};

export type ConsultMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type ConsultResult = {
  summary: string;
  advice: string;
  updated_at: string;
};

type Related<T> = T | T[] | null;

type RawBooking = {
  id: string;
  status: ConsultStatus;
  amount_idr: number;
  nutritionists: Related<NonNullable<ConsultBooking["expert"]>>;
  consultation_slots: Related<NonNullable<ConsultBooking["slot"]>>;
};

function one<T>(value: Related<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapBooking(raw: RawBooking): ConsultBooking {
  return {
    id: raw.id,
    status: raw.status,
    amount_idr: raw.amount_idr,
    expert: one(raw.nutritionists),
    slot: one(raw.consultation_slots),
  };
}

const bookingSelect = `
  id,
  status,
  amount_idr,
  nutritionists(
    display_name,
    specialty,
    photo_key,
    is_demo,
    account_id
  ),
  consultation_slots(
    starts_at,
    ends_at
  )
`;

export async function getMyConsultBookings() {
  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    throw new Error("Silakan login kembali.");
  }

  const { data, error } = await supabase
    .from("consultation_bookings")
    .select(bookingSelect)
    .eq("patient_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as RawBooking[])
    .map(mapBooking);
}

export async function getMyConsultBooking(bookingId: string) {
  const bookings = await getMyConsultBookings();
  const found = bookings.find((item) => item.id === bookingId);

  if (!found) {
    throw new Error("Booking tidak ditemukan di akunmu.");
  }

  return found;
}

export function consultDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function consultDay(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
  }).toUpperCase();
}

export function consultDayNumber(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
  });
}

export function consultMonth(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    month: "short",
    year: "numeric",
  }).toUpperCase();
}

export function consultTime(iso: string) {
  return new Date(iso)
    .toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(".", ":");
}

export function canSendConsultMessage(
  booking: ConsultBooking,
  now = new Date()
) {
  if (!booking.slot || !booking.expert?.account_id) {
    return false;
  }

  const time = now.getTime();

  return (
    booking.status === "paid_simulated" &&
    time >= new Date(booking.slot.starts_at).getTime() &&
    time < new Date(booking.slot.ends_at).getTime()
  );
}

export function consultStatusText(status: ConsultStatus) {
  switch (status) {
    case "pending_payment":
      return "Menunggu Pembayaran";
    case "paid_simulated":
      return "Terkonfirmasi";
    case "completed":
      return "Selesai";
    default:
      return "Dibatalkan";
  }
}
