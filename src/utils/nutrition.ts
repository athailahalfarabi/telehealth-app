
export type Sex = "female" | "male";
export type Activity = "low" | "moderate" | "high";

export function getAge(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference =
    today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

export function calculateBMI(
  heightCm: number,
  weightKg: number
) {
  if (heightCm <= 0 || weightKg <= 0) return 0;

  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getBMIStatus(bmi: number) {
  if (bmi <= 0) return "Belum dihitung";
  if (bmi < 18.5) return "Berat badan kurang";
  if (bmi < 25) return "Normal / Ideal";
  if (bmi < 30) return "Berat badan berlebih";
  return "Obesitas";
}

export function calculateDailyCalories(input: {
  birthDate: Date;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activity: Activity;
}) {
  const age = getAge(input.birthDate);

  // Mifflin-St Jeor: estimasi BMR orang dewasa
  const bmr =
    10 * input.weightKg +
    6.25 * input.heightCm -
    5 * age +
    (input.sex === "male" ? 5 : -161);

  const activityFactors: Record<Activity, number> = {
    low: 1.2,
    moderate: 1.375,
    high: 1.55,
  };

  const tdee = bmr * activityFactors[input.activity];

  return {
    bmr: Math.round(bmr),
    dailyCalories: Math.round(tdee),
  };
}
