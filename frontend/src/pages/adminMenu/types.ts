import type {
  BusinessPlan,
  MenuCategory,
  Restaurant,
} from "../../components/types";

export interface AdminMenuResponse {
  restaurant: Restaurant;
  categories: MenuCategory[];
  businessPlans?: BusinessPlan[];
}

export type PendingDelete =
  | {
      type: "category";
      id: string;
      name: string;
    }
  | {
      type: "item";
      id: string;
      name: string;
    };
