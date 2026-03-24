export const ADMIN_EMAILS = [
    'kangwoner@gmail.com', // 대표님 이메일
    'kangwonser@gmail.com', // 오타 방지 스페어
];

export const isAdmin = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
};
