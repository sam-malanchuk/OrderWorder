import { usePathname, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Button, Textfield } from "xtreme-ui";

import "./userLogin.scss";

const UserLogin = ({ setOpen, open }: UserLoginProps) => {
	const pathname = usePathname();
	const params = useSearchParams();
	const table = params.get("table") ?? "1";
	const [buttonLabel, setButtonLabel] = useState("Order");
	const [busy, setBusy] = useState(false);
	const [formResetKey, setFormResetKey] = useState(0);

	const [fname, setFName] = useState("");
	const [lname, setLName] = useState("");
	const [heading, setHeading] = useState(["Let's", " start ordering"]);

	const onNext = async () => {
		if (!fname.trim()) return toast.error("Please enter your first name");
		if (!lname.trim()) return toast.error("Please enter your last name");

		setBusy(true);

		const res = await signIn("customer", {
			redirect: false,
			restaurant: pathname.replaceAll("/", ""),
			fname,
			lname,
			table,
			callbackUrl: `${window.location.origin}`,
		});

		if (res?.error) {
			toast.error(res?.error);
		}
		setOpen(false);
		setBusy(false);
	};

	useEffect(() => {
		setHeading(["Let's", " start ordering"]);
		setButtonLabel("Order");
	}, []);

	useEffect(() => {
		if (!open) return;
		setFName("");
		setLName("");
		setFormResetKey((v) => v + 1);
	}, [open]);

	return (
		<div className="userLogin signOTP">
			<div className="header">
				<span className="heading">
					<span>{heading[0]}</span>
					{heading[1]}
				</span>
			</div>
			<div className="content">
				<div className="otpContainer">
					<Textfield
						key={`fname-${formResetKey}`}
						id="user-login-fname"
						name="order-first-name"
						className="fName"
						placeholder="First Name"
						autoComplete="new-password"
						autoCorrect="off"
						autoCapitalize="words"
						spellCheck={false}
						value={fname}
						onChange={(e: ChangeEvent<HTMLInputElement>) => setFName(e.target.value)}
					/>
					<Textfield
						key={`lname-${formResetKey}`}
						id="user-login-lname"
						name="order-last-name"
						className="lName"
						placeholder="Last Name"
						autoComplete="new-password"
						autoCorrect="off"
						autoCapitalize="words"
						spellCheck={false}
						onEnterKey={onNext}
						value={lname}
						onChange={(e: ChangeEvent<HTMLInputElement>) => setLName(e.target.value)}
					/>
					{/* <Textfield
						className='otp'
						placeholder='Enter Your otp'
						autoComplete='one-time-code'
						value={otp}
						onChange={(e) => setOtp(e.target.value)}
					/> */}
				</div>
			</div>
			<div className="footer">
				<Button label={buttonLabel} onClick={onNext} loading={busy} />
			</div>
		</div>
	);
};

export default UserLogin;

type UserLoginProps = {
	setOpen: (open: boolean) => void;
	open: boolean;
};
