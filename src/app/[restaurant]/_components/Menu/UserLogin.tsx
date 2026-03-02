import { usePathname, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Button, Textfield } from "xtreme-ui";

import "./userLogin.scss";

const UserLogin = ({ setOpen }: UserLoginProps) => {
	const pathname = usePathname();
	const params = useSearchParams();
	const [buttonLabel, setButtonLabel] = useState("Order");
	const [busy, setBusy] = useState(false);

	const [fname, setFName] = useState("");
	const [lname, setLName] = useState("");
	const [heading, setHeading] = useState(["Let's", " start ordering"]);

	const onNext = async () => {
		if (!params.get("table")) return toast.error("Please scan the QR Code");
		if (!fname.trim()) return toast.error("Please enter your first name");
		if (!lname.trim()) return toast.error("Please enter your last name");

		setBusy(true);

		const res = await signIn("customer", {
			redirect: false,
			restaurant: pathname.replaceAll("/", ""),
			fname,
			lname,
			table: params.get("table"),
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
						id="user-login-fname"
						className="fName"
						placeholder="First Name"
						autoComplete="given-name"
						value={fname}
						onChange={(e: ChangeEvent<HTMLInputElement>) => setFName(e.target.value)}
					/>
					<Textfield
						id="user-login-lname"
						className="lName"
						placeholder="Last Name"
						autoComplete="family-name"
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
};
