// Augment Express Request with authenticated fields
declare namespace Express {
  interface Request {
    ownerRestaurantId?: string
    ownerEmail?: string
    superAdminEmail?: string
  }
}
