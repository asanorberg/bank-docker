"use client";

import React, { useState, useEffect } from "react";
import Button from "@/app/components/Button";
import VerifyModal from "../components/VerifyModal";

const AccountPage = () => {
  const [username, setUsername] = useState("");
  const [balance, setBalance] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [depositValue, setDepositValue] = useState(0);
  const [data, setData] = useState([]);

  const fetchUserData = async () => {
    console.log("fetch initiated");
    try {
      const otp = localStorage.getItem("otp");
      console.log("Retrieved OTP from localStorage:", otp);
      if (!otp) {
        console.log("No OTP found in local storage");
        return;
      }

      const response = await fetch("http://localhost:4000/me/accounts", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${otp}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setData(data);
        console.log("Data is" + data);
        setUsername(data.username);
        console.log("User is" + data.username);
        setBalance(data.balance);
        console.log("Balance is" + data.balance);
      } else {
        console.error(
          "Failed to fetch user data",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.log("Failed to fetch user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleDeposit = async () => {
    console.log("deposit fetch initiated");

    const depositAmount = parseFloat(depositValue);
    if (!isNaN(depositAmount) && depositAmount > 0) {
      try {
        const response = await fetch(
          "http://localhost:4000/me/accounts/transactions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("otp")}`,
            },
            body: JSON.stringify({
              depositAmount: parseFloat(depositAmount),
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          setBalance(data.newBalance);
          console.log("Deposit successful");
          setDepositValue(0);
        } else {
          console.error("Deposit failed:");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
    setDepositValue("");
  };

  const handleVerify = () => {
    setShowModal(true);
  };

  function handleClose() {
    console.log("closing modal");
    setShowModal(false);
  }

  return (
    <main className="min-h-[600px] max-w-[1200px] flex flex-col items-center justify-center px-36">
      <div className="flex-col flex p-[80px]  md:py-[120px] md:px-[200px] border-blue-600 border-solid border-[1px] rounded-lg">
        <p>Logged in as: {username}</p>
        <p>Balance: {balance}</p>
        {isVerified && (
          <div className="flex-col flex">
            <input
              className="text-[22px] justify-center border-solid items-center w-[140px] h-[30px] p-2 rounded-lg"
              value={depositValue}
              onChange={(e) => setDepositValue(parseFloat(e.target.value))}
            />
            <button
              onClick={handleDeposit}
              className="flex-col text-[14px] justify-center items-center w-[160px] h-[30px] bg-green-600 p-6 text-white border-none rounded-lg mt-8 hover:bg-green-700 active:bg-green-900"
            >
              Deposit
            </button>
          </div>
        )}
        {!isVerified && (
          <div className="flex flex-col">
            <Button onClick={handleVerify}>Make a deposit</Button>
          </div>
        )}
        {isVerified && (
          <div className="flex flex-col">
            <button
              className="flex-col text-[14px] justify-center items-center w-[160px] h-[30px] bg-red-700 p-6 text-white border-none rounded-lg mt-8 hover:bg-red-800 active:bg-red-900"
              onClick={() => setIsVerified(false)}
            >
              Go back
            </button>
          </div>
        )}
      </div>
      {showModal && (
        <VerifyModal
          isVerified={isVerified}
          setIsVerified={setIsVerified}
          onClose={handleClose}
        />
      )}
    </main>
  );
};

export default AccountPage;
