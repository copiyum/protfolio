import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TurnstileWidget } from "../TurnstileWidget";

describe("TurnstileWidget", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = "";
    delete window.turnstile;
  });

  it("resets the existing widget when resetKey changes", async () => {
    const renderMock = vi.fn(() => "widget-1");
    const resetMock = vi.fn();
    const removeMock = vi.fn();
    window.turnstile = {
      render: renderMock,
      reset: resetMock,
      remove: removeMock,
    };
    const onToken = vi.fn();

    const { rerender, unmount } = render(
      <TurnstileWidget sitekey="sitekey" action="login" onToken={onToken} resetKey={0} />,
    );

    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));

    rerender(<TurnstileWidget sitekey="sitekey" action="login" onToken={onToken} resetKey={1} />);

    expect(onToken).toHaveBeenLastCalledWith("");
    expect(resetMock).toHaveBeenCalledWith("widget-1");

    unmount();
    expect(removeMock).toHaveBeenCalledWith("widget-1");
  });
});
