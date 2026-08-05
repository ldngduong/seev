export interface JwtPayload {
  sub: string;
  email: string;
  tokenType: 'access';
}

export interface RefreshJwtPayload {
  sub: string;
  sid: string;
  familyId: string;
  tokenType: 'refresh';
}
