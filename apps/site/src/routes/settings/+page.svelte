<script lang="ts">
</script>

<section>
	<h1 class="h2">Edit Profile</h1>
</section>

<section>
	<h2>Basic Information</h2>

	<form action="">
		<!-- email -->

		<!-- username -->

		<!-- if changed, show save button -->
	</form>

	<!-- reset password -->
</section>

<form method="post" action="/?/logout">
	<button type="submit">Logout</button>
</form>

<section>
	<div class="card border-red-500 bg-red-500/10">
		<h2>Danger Zone</h2>

		<p>Actions in this section can permanently delete your data.</p>
		<!-- danger zone -->

		<div class="flex flex-col gap-2">
			<h3 class="font-medium">Delete Account</h3>
			<p class="text-muted-foreground mb-2 text-sm">
				Permanently delete your account and all of your content. This action cannot be undone.
			</p>
			<div>
				<!-- <DeleteAccountDialog /> -->
			</div>
		</div>
	</div>
</section>
