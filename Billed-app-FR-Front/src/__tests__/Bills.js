/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import Bills from "../containers/Bills.js";

import router from "../app/Router.js";
jest.mock("../app/store", () => mockStore);

// Test the UI
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

// Test the getBills function
describe("Given I am connected as an employee", () => {
	let billsInstance;
	beforeEach(() => {
		// Set up the environment
		document.body.innerHTML = BillsUI({ data: bills });
		const onNavigate = jest.fn();
		billsInstance = new Bills({
			document,
			onNavigate,
			store: {
				bills: jest.fn(() => ({
					list: jest.fn(() =>
						Promise.resolve([
							{ id: 1, date: "2022-01-01", status: "pending" },
							{ id: 2, date: "2021-01-01", status: "accepted" }
						])
					)
				}))
			},
			localStorage: window.localStorage
		});
	});

	describe("When I call getBills", () => {
		test("Then it should return a sorted list of bills by date in descending order", async () => {
			const sortedBills = await billsInstance.getBills();
			expect(sortedBills.length).toBe(2);
			expect(sortedBills[0].date).toBe("1 Jan. 22");
			expect(sortedBills[1].date).toBe("1 Jan. 21");
		});

		describe("When formatDate fails", () => {
			test("Then it should catch an error, log it, and return the original date", async () => {
				// The store returns a bill with an invalid date
				billsInstance.store.bills = jest.fn(() => ({
					list: jest.fn(() => Promise.resolve([{ id: 1, date: "invalid-date", status: "pending" }]))
				}));

				// When I call getBills
				const consoleSpy = jest.spyOn(console, "log");
				const billsList = await billsInstance.getBills();

				// The error should be logged
				expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error), "for", {
					id: 1,
					date: "invalid-date",
					status: "pending"
				});
				// The bill should have the original date
				expect(billsList[0].date).toBe("invalid-date");
				consoleSpy.mockRestore();
			});
		});

		describe("When the store is null", () => {
			test("Then it should return undefined", async () => {
				billsInstance.store = null;

				const result = await billsInstance.getBills();

				expect(result).toBeUndefined();
			});
		});
	});
});

// test d'intégration GET
describe("Given I am a user connected as an employee", () => {
	describe("WWhen I am on Bills page", () => {
		test("Then fetches bills from mock API GET", async () => {
			Object.defineProperty(window, "localStorage", { value: localStorageMock });
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
					email: "employee@test.tld",
					status: "connected"
				})
			);
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.appendChild(root);
			router();
			window.onNavigate(ROUTES_PATH.Bills);

			const dataMocked = jest.spyOn(mockStore.bills(), "list");
			mockStore.bills().list();

			await waitFor(() => {
				expect(dataMocked).toHaveBeenCalledTimes(1);
				expect(document.querySelectorAll("tbody tr").length).toBe(4);
				expect(screen.findByText("Mes notes de frais")).toBeTruthy();
			});
		});

		describe("When an error occurs on API", () => {
			beforeEach(() => {
				jest.spyOn(mockStore, "bills");
				Object.defineProperty(window, "localStorage", { value: localStorageMock });
				window.localStorage.setItem(
					"user",
					JSON.stringify({
						type: "Employee",
						email: "employee@test.tld",
						status: "connected"
					})
				);
				const root = document.createElement("div");
				root.setAttribute("id", "root");
				document.body.appendChild(root);
				router();
			});
			afterEach(() => {
				jest.clearAllMocks();
			});
			test("Then fetches bills from an API and fails with 404 message error", async () => {
				mockStore.bills.mockImplementationOnce(() => {
					return {
						list: () => {
							return Promise.reject(new Error("Erreur 404"));
						}
					};
				});
				window.onNavigate(ROUTES_PATH.Bills);
				await new Promise(process.nextTick);
				const message = await screen.getByText(/Erreur 404/);
				expect(message).toBeTruthy();
			});

			test("Then fetches messages from an API and fails with 500 message error", async () => {
				mockStore.bills.mockImplementationOnce(() => {
					return {
						list: () => {
							return Promise.reject(new Error("Erreur 500"));
						}
					};
				});

				window.onNavigate(ROUTES_PATH.Bills);
				await new Promise(process.nextTick);
				const message = await screen.getByText(/Erreur 500/);
				expect(message).toBeTruthy();
			});
		});
	});
});
