/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import store from "../__mocks__/store";

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
	describe("When I am on NewBill Page", () => {
		let newBill;
		let onNavigate;
		beforeEach(() => {
			document.body.innerHTML = NewBillUI();

			Object.defineProperty(window, "localStorage", { value: localStorageMock });
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee"
				})
			);

			onNavigate = jest.fn();

			store.bills = jest.fn(() => ({
				create: jest.fn().mockResolvedValue({
					fileUrl: "https://localhost:3456/images/test.jpg",
					key: "12345"
				}),
				update: jest.fn().mockResolvedValue({})
			}));

			newBill = new NewBill({
				document,
				onNavigate,
				store,
				localStorage: window.localStorage
			});
		});

		test("Then the mail icon in vertical layout should be highlighted", async () => {
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.NewBill);
			await waitFor(() => screen.getByTestId("icon-mail"));
			const mailIcon = screen.getByTestId("icon-mail");
			expect(mailIcon.classList.contains("active-icon")).toBe(true);
		});

		test("Then the form should be displayed", () => {
			expect(screen.getByTestId("form-new-bill")).toBeTruthy();
		});

		describe("When I upload a file", () => {
			test("Then it should alert if the file is not a valid type", () => {
				window.alert = jest.fn();
				const fileInput = screen.getByTestId("file");
				const invalidFile = new File(["file"], "file.txt", { type: "text/plain" });

				fireEvent.change(fileInput, { target: { files: [invalidFile] } });

				expect(window.alert).toHaveBeenCalledWith("Format de fichier non valide");
				expect(fileInput.value).toBe("");
			});

			test("Then it should store fileUrl and fileName if valid", async () => {
				const handleChangeFile = jest.fn(() => newBill.handleChangeFile);
				const fileInput = screen.getByTestId("file");
				const validFile = new File(["file"], "file.jpg", { type: "image/jpg" });

				fireEvent.change(fileInput, { target: { files: [validFile] } });

				await expect(handleChangeFile).toHaveBeenCalled;
				expect(window.alert).not.toBe("Format de fichier non valide");
			});
		});

		describe("When I click on the submit button", () => {
			test("Then it should prevent the default submission and call updateBill", () => {
				const formNewBill = screen.getByTestId("form-new-bill");
				const handleSubmit = jest.spyOn(newBill, "handleSubmit");

				formNewBill.addEventListener("submit", handleSubmit);
				fireEvent.submit(formNewBill);

				expect(handleSubmit).toHaveBeenCalled();
				expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
			});
		});
	});
});
