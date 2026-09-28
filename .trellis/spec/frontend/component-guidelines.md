# Components: shadcn/ui and Base UI

Sources: [selected stack](../../../docs/11-technology-and-deployment.md), [UI contract](../../../docs/07-owner-review-and-ui.md), [official Base UI support](https://ui.shadcn.com/docs/changelog/2026-01-base-ui), [Dialog](https://ui.shadcn.com/docs/components/base/dialog).

## Baseline

Select Base UI explicitly in shadcn setup and retain the generated configuration. Components are source owned by the Web package, with runtime primitives such as `@base-ui/react`. This is not dependency-free. Add only used components, review their imports/transitive dependencies, and do not mix in Radix for the same interactions.

Use shared semantic Tailwind/theme tokens for spacing, surfaces and status. Put product behavior in feature components; primitives should not know Task lifecycle or issue backend commands.

## Composition

Follow the selected Base UI component's current API. Do not copy Radix-only `asChild` usage into Base UI examples blindly. Official composition sketch:

```tsx
<Dialog>
  <DialogTrigger render={<Button variant="outline" />}>
    View delivery
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Accepted delivery</DialogTitle>
      <DialogDescription>
        Later messages will not change this accepted result.
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

This illustrates the official API; no such local component exists yet. Import from the generated local UI modules after scaffolding.

## Interaction and accessibility

- Use actual buttons, labels and form controls; preserve Base UI refs/handlers and composition semantics.
- Dialogs need accessible titles, keyboard dismissal where appropriate, correct focus trapping and return to trigger.
- Avoid nested interactive controls. Associate field errors with inputs.
- Preserve Todo/Task composer drafts by identity; switching selection must not lose input.
- Ordinary chat/guidance before acceptance needs no extra approval dialog. Exact Task/Plan/requirement/delivery confirmations show the concrete proposal.
- Explain backend-disabled actions and operation progress in context.
- Default to CSS for simple transitions, respect reduced motion and keep actions usable during animation.

## Verification

Check keyboard navigation, focus return, repeated open/close, mobile layout and server-error recovery. Adding a primitive does not require re-testing every upstream implementation detail; test the behavior introduced by our composition.
