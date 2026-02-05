def split_amount_fixed_cut(total_amount: int, admin_cut_percent: int = 40):
    admin_cut_percent = int(admin_cut_percent)
    if admin_cut_percent < 0 or admin_cut_percent > 100:
        raise ValueError("admin_cut_percent must be 0..100")

    admin_cut = int(total_amount * (admin_cut_percent / 100.0))
    payout = int(total_amount) - admin_cut
    return payout, admin_cut
