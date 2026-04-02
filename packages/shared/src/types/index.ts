export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Clinic extends BaseEntity {
  name: string;
  slug: string;
}

export * from "./lgpd";
export * from "./auth";
