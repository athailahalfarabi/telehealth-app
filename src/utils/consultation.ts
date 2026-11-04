
export type Nutritionist = {
  id: string;
  display_name: string;
  specialty: string;
  bio: string;
  focus: "weight" | "eating" | "mother";
  photo_key: "female" | "male";
  session_minutes: number;
  price_idr: number;
  is_verified: boolean;
  is_demo: boolean;
  is_active: boolean;
};

export type ConsultationSlot = {
  id: string;
  nutritionist_id: string;
  starts_at: string;
  ends_at: string;
  is_booked: boolean;
};

export const doctorPhotos = {
  female: require("../../assets/images/dokterP.png"),
  male: require("../../assets/images/dokterL.png"),
};

export function formatRupiah(amount: number) {
  return `Rp${Number(amount).toLocaleString("id-ID")}`;
}

export function dateKey(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function longDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(".", ":");
}

export function slotTime(slot: ConsultationSlot) {
  return `${timeLabel(slot.starts_at)} - ${timeLabel(slot.ends_at)}`;
}
