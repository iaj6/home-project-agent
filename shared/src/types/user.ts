export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  primaryHomeId?: string;
  projectCount: number;
  createdAt: Date;
}
