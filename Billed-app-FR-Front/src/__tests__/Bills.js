/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills.js";

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
	describe("When I am on Bills Page", () => {
		test("Then bill icon in vertical layout should be highlighted", async () => {
			Object.defineProperty(window, "localStorage", { value: localStorageMock });
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee"
				})
			);
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.Bills);
			await waitFor(() => screen.getByTestId("icon-window"));
			const windowIcon = screen.getByTestId("icon-window");
			expect(windowIcon.classList.contains("active-icon")).toBe(true);
		});
		test("Then bills should be ordered from earliest to latest", () => {
			document.body.innerHTML = BillsUI({ data: bills });
			const dates = screen
				.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i)
				.map((a) => a.innerHTML);
			const antiChrono = (a, b) => (a < b ? 1 : -1);
			const datesSorted = [...dates].sort(antiChrono);
			expect(dates).toEqual(datesSorted);
		});

		describe("When I click on the new bill button", () => {
			test("Then I should be redirected to the New Bill page", () => {
				// Set up the html
				document.body.innerHTML = BillsUI({ data: bills });
				// Define navigation logic
				const onNavigate = (pathname) => {
					document.body.innerHTML = ROUTES({ pathname });
				};
				// Create an instance of the Bills class
				const billsInstance = new Bills({
					document,
					onNavigate,
					store: null, // test doesn't make API request, but just simulates UI interactions
					localStorage: window.localStorage
				});
				// Select concerned button
				const buttonNewBill = screen.getByTestId("btn-new-bill");
				const handleClickNewBill = jest.fn(billsInstance.handleClickNewBill);
				buttonNewBill.addEventListener("click", handleClickNewBill);
				// Simulate button click
				userEvent.click(buttonNewBill);

				expect(handleClickNewBill).toHaveBeenCalled();
				expect(screen.getByTestId("form-new-bill")).toBeTruthy();
			});
		});

		describe("When I click on the preview icon", () => {
			test("Then the modal should open", () => {
				// Mock the modal function
				$.fn.modal = jest.fn();
				// Mock the DOM environment for the test
				document.body.innerHTML = `
					<div data-testid="icon-eye" data-bill-url="https://example.com/bill.jpg"></div>
					<div id="modaleFile">
						<div class="modal-body"></div>
					</div>
				`;
				// Create an instance of the Bills class
				const billsInstance = new Bills({
					document,
					onNavigate: jest.fn(),
					store: null,
					localStorage: window.localStorage
				});
				// Simulate clicking on the preview icon
				const iconEye = screen.getByTestId("icon-eye");
				iconEye.click();

				expect($.fn.modal).toHaveBeenCalledWith("show");
			});
		});
	});
});

// test d'intégration GET
// describe("Given I am connected as an employee", () => {
// 	describe("When I am on Bills Page", () => {
// 		test("bills should be fetched from the mock API GET", () => {
// 			// test content
// 		});
// 	});
// });
