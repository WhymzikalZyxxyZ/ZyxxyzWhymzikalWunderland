// ── Built-in recipes ───────────────────────────────────────────────────────
        const BUILT_IN = [
            {
                id: 'bi-1', emoji: '🧙', name: "Wizard's Mac & Cheese",
                category: 'Food',
                desc: 'The most comforting spell in the grimoire. Creamy, gooey, and slightly legendary.',
                tags: ['comfort', 'cheesy', 'baked'],
                ingredients: [
                    '450g (1 lb) elbow macaroni',
                    '4 tbsp butter',
                    '¼ cup all-purpose flour',
                    '3 cups whole milk',
                    '2 cups sharp cheddar, shredded',
                    '1 cup gruyère, shredded',
                    '½ tsp mustard powder',
                    'Salt, pepper & a pinch of paprika',
                    'Breadcrumbs for topping (optional)',
                ],
                steps: [
                    'Preheat oven to 190°C / 375°F.',
                    'Cook macaroni in salted water until al dente. Drain and set aside.',
                    'Melt butter in a large saucepan over medium heat. Whisk in flour and cook 1 min.',
                    'Gradually whisk in milk until smooth. Simmer until thickened, about 5 min.',
                    'Remove from heat and stir in both cheeses, mustard powder, salt, and pepper.',
                    'Fold in the pasta and pour into a greased baking dish.',
                    'Top with breadcrumbs and a dusting of paprika.',
                    'Bake 20–25 min until golden and bubbling. Let sit 5 min before serving.',
                ],
            },
            {
                id: 'bi-2', emoji: '🥞', name: 'Moonbeam Pancakes',
                category: 'Breakfast',
                desc: 'Impossibly fluffy pancakes that seem to glow from within. Best eaten at sunrise.',
                tags: ['fluffy', 'quick', 'sweet'],
                ingredients: [
                    '1½ cups all-purpose flour',
                    '2 tbsp sugar',
                    '1 tsp baking powder',
                    '½ tsp baking soda',
                    '¼ tsp salt',
                    '1 cup buttermilk',
                    '1 large egg',
                    '2 tbsp melted butter',
                    '1 tsp vanilla extract',
                ],
                steps: [
                    'Whisk together flour, sugar, baking powder, baking soda, and salt in a bowl.',
                    'In a second bowl mix buttermilk, egg, butter, and vanilla.',
                    'Pour wet into dry and fold gently — lumps are fine, do not overmix.',
                    'Let batter rest 5 min while you heat a non-stick pan over medium-low.',
                    'Grease lightly and pour ¼ cup batter per pancake.',
                    'Cook until bubbles form on top and edges look set, about 2 min.',
                    'Flip once and cook 1 more min. Serve with maple syrup or enchanted berries.',
                ],
            },
            {
                id: 'bi-3', emoji: '🐉', name: 'Dragon Egg Deviled Eggs',
                category: 'Snack',
                desc: 'Fiery, creamy deviled eggs with a smoky paprika kick. Handle with care.',
                tags: ['spicy', 'party'],
                ingredients: [
                    '6 large eggs, hard-boiled and peeled',
                    '3 tbsp mayonnaise',
                    '1 tsp Dijon mustard',
                    '1 tsp sriracha (or more, adventurer)',
                    '1 tsp apple cider vinegar',
                    'Salt and pepper to taste',
                    'Smoked paprika and chives to garnish',
                ],
                steps: [
                    'Slice eggs in half lengthwise and pop yolks into a bowl.',
                    'Mash yolks with mayo, mustard, sriracha, and vinegar until smooth.',
                    'Season with salt and pepper. Taste and adjust heat to your dragon level.',
                    'Pipe or spoon filling back into egg whites.',
                    'Dust generously with smoked paprika and top with sliced chives.',
                    'Refrigerate until ready to serve — best within 2 hours of making.',
                ],
            },
            {
                id: 'bi-4', emoji: '⚡', name: 'Thundercloud Chili',
                category: 'Food',
                desc: 'A hearty, storm-worthy chili that rumbles all afternoon and gets better the next day.',
                tags: ['hearty', 'spicy', 'slow-cook'],
                ingredients: [
                    '500g (1 lb) ground beef or turkey',
                    '1 can (400g) diced tomatoes',
                    '1 can (400g) kidney beans, drained',
                    '1 can (400g) black beans, drained',
                    '1 onion, diced',
                    '3 garlic cloves, minced',
                    '1 red bell pepper, diced',
                    '2 tbsp chili powder',
                    '1 tsp each: cumin and smoked paprika',
                    '1 cup beef or veggie broth',
                    'Salt, pepper, a squeeze of lime',
                ],
                steps: [
                    'Brown the meat in a large pot over medium-high heat, seasoned with salt. Remove and set aside.',
                    'In the same pot sauté onion and pepper until soft, about 5 min. Add garlic and cook 1 min more.',
                    'Add chili powder, cumin, and paprika. Stir to coat and cook 30 seconds.',
                    'Return the meat. Add tomatoes, beans, and broth. Stir everything together.',
                    'Bring to a boil, then reduce heat and simmer uncovered for 30–45 min.',
                    'Adjust seasoning. Finish with a squeeze of lime.',
                    'Serve with cornbread, sour cream, shredded cheddar, or all of the above.',
                ],
            },
            {
                id: 'bi-5', emoji: '🌮', name: 'Enchanted Tacos',
                category: 'Food',
                desc: 'Crispy-edged seasoned meat tucked into warm tortillas with all the magical toppings.',
                tags: ['quick', 'crowd-pleaser'],
                ingredients: [
                    '500g (1 lb) ground beef or black beans',
                    '1 tbsp olive oil',
                    '1 tsp each: cumin, chili powder, garlic powder',
                    '½ tsp paprika, salt and pepper',
                    '¼ cup water',
                    '8 small corn or flour tortillas',
                    'Toppings: shredded lettuce, diced tomato, cheddar, sour cream, salsa, lime',
                ],
                steps: [
                    'Heat oil in a skillet over medium-high. Add meat and break apart. Cook until browned.',
                    'Drain excess fat. Add all spices and stir to coat.',
                    'Add water and simmer 3–4 min until sauce is absorbed and meat is glazed.',
                    'Warm tortillas in a dry pan or directly over a gas burner for 20 seconds per side.',
                    'Load each tortilla with meat and all your chosen toppings.',
                    'Squeeze lime over everything. Eat immediately.',
                ],
            },
            {
                id: 'bi-6', emoji: '☕', name: 'Potion of Awakening',
                category: 'Drink',
                desc: 'A perfectly brewed elixir to summon consciousness on even the most bewitched of mornings.',
                tags: ['coffee', 'hot', 'morning'],
                ingredients: [
                    '18g freshly ground coffee (medium-coarse grind)',
                    '300ml water at 93°C / 200°F (just off the boil)',
                    'Optional: splash of cream, spoonful of honey',
                ],
                steps: [
                    'Heat water to 93°C — just off the boil, let it rest 30 seconds after boiling.',
                    'Pour-over method: wet the filter, add coffee grounds. Bloom with ~50ml water for 30 sec.',
                    'Slowly pour remaining water in a steady spiral over 2–3 min total.',
                    'French press method: add grounds, pour all water, stir, steep 4 min, then press slowly.',
                    'Taste before adding anything — a well-brewed potion needs no decoration.',
                    'If desired, stir in a splash of cream and a spoonful of honey. Sip mindfully.',
                ],
            },
            {
                id: 'bi-7', emoji: '💙', name: 'Mystic Blue Lemonade',
                category: 'Drink',
                desc: 'Shimmering cerulean lemonade that turns violet when you add the citrus. Pure alchemy.',
                tags: ['cold', 'fruity', 'magical', 'caffeine-free'],
                ingredients: [
                    '2 tbsp dried butterfly pea flowers (or 1 specialty tea bag)',
                    '1 cup boiling water',
                    '½ cup sugar',
                    '1 cup fresh lemon juice (about 6 lemons)',
                    '3 cups cold water',
                    'Ice, lemon slices, and fresh mint to serve',
                ],
                steps: [
                    'Steep butterfly pea flowers in boiling water for 10 min to brew a deep blue tea. Strain and cool.',
                    'Make simple syrup: dissolve sugar in ½ cup warm water, then let cool.',
                    'Combine blue tea, simple syrup, and lemon juice in a pitcher.',
                    'Watch in wonder as the blue transforms to violet-purple upon mixing!',
                    'Add the remaining cold water and stir.',
                    'Serve over ice garnished with lemon slices and fresh mint.',
                    'For layered magic: pour the blue tea over ice first, then slowly add lemonade on top.',
                ],
            },
            {
                id: 'bi-8', emoji: '🍫', name: "Witch's Brew Hot Cocoa",
                category: 'Drink',
                desc: 'Spiced, velvety hot chocolate with a whisper of mystery. Stir clockwise for good luck.',
                tags: ['hot', 'cozy', 'chocolate', 'spiced'],
                ingredients: [
                    '2 cups whole milk (or oat milk)',
                    '3 tbsp unsweetened cocoa powder',
                    '2 tbsp sugar',
                    '1 small pinch of cinnamon',
                    '1 tiny pinch of cayenne pepper',
                    '¼ tsp vanilla extract',
                    'A small pinch of sea salt',
                    'Whipped cream and mini marshmallows to top',
                ],
                steps: [
                    'Warm milk in a small saucepan over medium heat — do not boil.',
                    'In a mug, whisk together cocoa powder, sugar, cinnamon, and cayenne.',
                    'Add a splash of warm milk to the mug and stir into a smooth paste.',
                    'Pour remaining warm milk into the mug while stirring.',
                    'Add vanilla and salt. Stir once more — clockwise, of course.',
                    'Top with whipped cream and marshmallows. Serve immediately.',
                ],
            },
            {
                id: 'bi-9', emoji: '🌟', name: 'Stardust Smoothie',
                category: 'Drink',
                desc: 'A vibrant berry-banana smoothie that shimmers like the Milky Way at midnight.',
                tags: ['cold', 'fruity', 'healthy', 'quick'],
                ingredients: [
                    '1 frozen banana, sliced',
                    '1 cup frozen mixed berries (blueberry, raspberry, strawberry)',
                    '½ cup Greek yogurt',
                    '¾ cup oat milk or any milk',
                    '1 tbsp honey or maple syrup',
                    '1 tsp acai powder (optional — the stardust!)',
                ],
                steps: [
                    'Add all ingredients to a blender.',
                    'Blend on high until completely smooth, about 45 seconds.',
                    'Taste and adjust sweetness with more honey.',
                    'Pour into a glass and serve immediately for peak galaxy energy.',
                    'Optional: top with granola, fresh berries, or a sprinkle of acai powder.',
                ],
            },
            {
                id: 'bi-10', emoji: '🌿', name: 'Elixir of Calm',
                category: 'Drink',
                desc: 'A soothing chamomile and lavender tea that quiets the mind and banishes worries.',
                tags: ['hot', 'herbal', 'caffeine-free', 'cozy'],
                ingredients: [
                    '1 chamomile tea bag (or 1 tbsp loose chamomile flowers)',
                    '¼ tsp dried culinary lavender buds',
                    '1 cup freshly boiled water',
                    '1 tsp honey',
                    'Optional: splash of oat milk or a slice of lemon',
                ],
                steps: [
                    'Place chamomile and lavender in a mug or small teapot.',
                    'Pour boiling water over and steep for 5–7 minutes.',
                    'Strain if using loose herbs.',
                    'Stir in honey while still warm.',
                    'Add oat milk for a creamier elixir, or a squeeze of lemon for brightness.',
                    'Sit somewhere quiet. Breathe in the steam. Sip slowly.',
                ],
            },
            {
                id: 'bi-11', emoji: '🧁', name: 'Spellbound Brownies',
                category: 'Dessert',
                desc: 'Dense, fudgy brownies with a crinkly top. One bite and you are under their spell.',
                tags: ['chocolate', 'fudgy', 'baked', 'sweet'],
                ingredients: [
                    '115g (½ cup) butter, melted',
                    '200g (1 cup) granulated sugar',
                    '2 large eggs',
                    '1 tsp vanilla extract',
                    '75g (¾ cup) cocoa powder',
                    '65g (½ cup) all-purpose flour',
                    '½ tsp salt',
                    '100g dark chocolate chips (optional but strongly recommended)',
                ],
                steps: [
                    'Preheat oven to 175°C / 350°F. Grease and line an 8×8 inch baking pan.',
                    'Whisk melted butter and sugar together until combined.',
                    'Beat in eggs one at a time, then stir in vanilla.',
                    'Sift in cocoa powder, flour, and salt. Fold until just combined.',
                    'Stir in chocolate chips if using.',
                    'Pour into the pan and smooth the top.',
                    'Bake 22–25 min. The center should look slightly under-done when you pull it out.',
                    'Let cool completely in the pan before cutting — patience is part of the spell.',
                ],
            },
            {
                id: 'bi-12', emoji: '🍪', name: 'Pixie Sugar Cookies',
                category: 'Dessert',
                desc: 'Soft, buttery sugar cookies with crisp edges. Decorate with wild abandon.',
                tags: ['sweet', 'baked', 'decorating'],
                ingredients: [
                    '2¾ cups all-purpose flour',
                    '1 tsp baking soda',
                    '½ tsp baking powder',
                    '1 cup softened butter',
                    '1½ cups sugar',
                    '1 egg',
                    '1 tsp vanilla extract',
                    'Sprinkles, icing, and edible glitter for decorating',
                ],
                steps: [
                    'Preheat oven to 190°C / 375°F.',
                    'Whisk flour, baking soda, and baking powder together.',
                    'Beat butter and sugar until fluffy, about 3 min. Add egg and vanilla.',
                    'Stir in the flour mixture until a soft dough forms.',
                    'Roll dough into 1-inch balls, place on a lined baking sheet, and flatten slightly.',
                    'Bake 8–10 min until edges are just golden. They will look underdone — that is correct!',
                    'Cool on the pan for 5 min, then transfer to a rack.',
                    'Once cool, decorate with icing and sprinkles with maximum whimsy.',
                ],
            },
            {
                id: 'bi-13', emoji: '🎃', name: 'Goblin Guacamole',
                category: 'Snack',
                desc: 'Chunky, bright, and mischievous — this guac disappears faster than you made it.',
                tags: ['quick', 'vegan', 'fresh'],
                ingredients: [
                    '3 ripe avocados',
                    '1 lime, juiced',
                    '½ tsp salt',
                    '½ red onion, finely diced',
                    '2 roma tomatoes, diced and seeded',
                    '1 jalapeño, seeded and minced',
                    '¼ cup fresh cilantro, chopped',
                    '1 garlic clove, minced',
                ],
                steps: [
                    'Cut avocados in half, remove pits, and scoop flesh into a bowl.',
                    'Add lime juice and salt. Mash to your preferred consistency (chunky is goblin-approved).',
                    'Fold in onion, tomatoes, jalapeño, cilantro, and garlic.',
                    'Taste and adjust — more lime? More salt? More jalapeño?',
                    'Press plastic wrap directly onto the surface to prevent browning.',
                    'Serve immediately with tortilla chips. Guard it from goblins.',
                ],
            },
            {
                id: 'bi-14', emoji: '🍿', name: 'Fairy Dust Popcorn',
                category: 'Snack',
                desc: 'Cinnamon sugar popcorn dusted with something magical. Impossible to stop eating.',
                tags: ['sweet', 'quick'],
                ingredients: [
                    '½ cup popcorn kernels',
                    '3 tbsp neutral oil for popping',
                    '3 tbsp butter, melted',
                    '¼ cup powdered sugar',
                    '1 tsp cinnamon',
                    '¼ tsp fine salt',
                    'Optional: a tiny pinch of cardamom',
                ],
                steps: [
                    'Pop kernels in a large covered pot with oil over medium-high heat until popping slows.',
                    'Transfer to a very large bowl, discarding any unpopped kernels.',
                    'Drizzle with melted butter and toss to coat evenly.',
                    'Mix powdered sugar, cinnamon, and salt in a small bowl.',
                    'Sift the fairy dust over the popcorn while tossing constantly.',
                    'Eat immediately — the magic fades after about 20 minutes.',
                ],
            },
            {
                id: 'bi-15', emoji: '🥗', name: 'Enchanted Forest Salad',
                category: 'Food',
                desc: 'A vibrant, crunchy salad that tastes like it was assembled by woodland sprites.',
                tags: ['healthy', 'fresh', 'vegan', 'quick'],
                ingredients: [
                    '4 cups mixed greens (spinach, arugula, spring mix)',
                    '1 cup blueberries or sliced strawberries',
                    '½ cup candied pecans or walnuts',
                    '¼ cup crumbled goat cheese or feta',
                    '½ cucumber, thinly sliced',
                    '2 tbsp olive oil',
                    '1 tbsp balsamic vinegar',
                    '1 tsp honey, salt and pepper',
                ],
                steps: [
                    'Toss greens into a wide bowl.',
                    'Scatter berries, nuts, cheese, and cucumber on top.',
                    'In a small bowl whisk olive oil, balsamic, honey, salt, and pepper.',
                    'Drizzle dressing over the salad just before serving.',
                    'Toss gently and serve at once — do not let it sit or the magic wilts.',
                ],
            },
        ];

        // ── State & storage ────────────────────────────────────────────────────────
        const STORAGE_KEY = 'wunderland_recipes';
        let activeFilter  = 'All';

        function loadUserRecipes() {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
            catch { return []; }
        }

        function saveUserRecipes(arr) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        }

        function allRecipes() { return [...BUILT_IN, ...loadUserRecipes()]; }

        // ── Filters ────────────────────────────────────────────────────────────────
        function buildFilters() {
            const cats = ['All', ...new Set(allRecipes().map(r => r.category))];
            const row  = document.getElementById('filter-row');
            row.innerHTML = '';
            cats.forEach(c => {
                const btn = document.createElement('button');
                btn.className = 'filter-btn' + (c === activeFilter ? ' active' : '');
                btn.textContent = c === 'All' ? '✨ All' : c;
                btn.addEventListener('click', () => {
                    activeFilter = c;
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderGrid();
                });
                row.appendChild(btn);
            });
        }

        // ── Grid ───────────────────────────────────────────────────────────────────
        function renderGrid() {
            const query   = document.getElementById('search-input').value.toLowerCase().trim();
            const grid    = document.getElementById('recipe-grid');
            const userIds = new Set(loadUserRecipes().map(r => r.id));

            const filtered = allRecipes().filter(r => {
                const catOk    = activeFilter === 'All' || r.category === activeFilter;
                const searchOk = !query
                    || r.name.toLowerCase().includes(query)
                    || r.desc.toLowerCase().includes(query)
                    || r.category.toLowerCase().includes(query)
                    || (r.tags || []).some(t => t.toLowerCase().includes(query));
                return catOk && searchOk;
            });

            grid.innerHTML = '';

            if (!filtered.length) {
                grid.innerHTML = '<div class="empty-notice">No recipes found... perhaps they vanished into the ether? ✨</div>';
                return;
            }

            filtered.forEach(r => {
                const card = document.createElement('div');
                card.className = 'recipe-card' + (userIds.has(r.id) ? ' user-added' : '');
                card.innerHTML =
                    '<span class="card-emoji">' + (r.emoji || '🍽') + '</span>' +
                    '<div class="card-name">' + esc(r.name) + '</div>' +
                    '<span class="card-category">' + esc(r.category) + '</span>' +
                    '<div class="card-desc">' + esc(r.desc) + '</div>';

                if (userIds.has(r.id)) {
                    const del = document.createElement('button');
                    del.className = 'card-delete';
                    del.textContent = '✕';
                    del.title = 'Delete recipe';
                    del.addEventListener('click', ev => {
                        ev.stopPropagation();
                        if (!confirm('Remove "' + r.name + '" from your recipe book?')) return;
                        saveUserRecipes(loadUserRecipes().filter(x => x.id !== r.id));
                        buildFilters();
                        renderGrid();
                    });
                    card.appendChild(del);
                }

                card.addEventListener('click', () => openModal(r));
                grid.appendChild(card);
            });
        }

        // ── View modal ─────────────────────────────────────────────────────────────
        function openModal(r) {
            document.getElementById('m-emoji').textContent    = r.emoji || '🍽';
            document.getElementById('m-title').textContent    = r.name;
            document.getElementById('m-category').textContent = r.category;
            document.getElementById('m-desc').textContent     = r.desc;

            const ingList = document.getElementById('m-ingredients');
            ingList.innerHTML = '';
            (r.ingredients || []).forEach(ing => {
                const li = document.createElement('li');
                li.textContent = ing;
                ingList.appendChild(li);
            });

            const stepList = document.getElementById('m-steps');
            stepList.innerHTML = '';
            (r.steps || []).forEach(s => {
                const li = document.createElement('li');
                li.textContent = s;
                stepList.appendChild(li);
            });

            const tagWrap = document.getElementById('m-tags');
            tagWrap.innerHTML = '';
            (r.tags || []).forEach(t => {
                const span = document.createElement('span');
                span.className = 'modal-tag';
                span.textContent = '#' + t;
                tagWrap.appendChild(span);
            });

            document.getElementById('modal-backdrop').classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeModalBackdrop(e) {
            if (e.target === document.getElementById('modal-backdrop')) closeModalDirect();
        }
        function closeModalDirect() {
            document.getElementById('modal-backdrop').classList.remove('open');
            document.body.style.overflow = '';
        }

        // ── Add modal ──────────────────────────────────────────────────────────────
        function openAddModal() {
            ['f-name','f-emoji','f-desc','f-ingredients','f-steps','f-tags'].forEach(id => {
                document.getElementById(id).value = '';
            });
            document.getElementById('f-category').value = 'Food';
            document.getElementById('add-modal-backdrop').classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeAddModalBackdrop(e) {
            if (e.target === document.getElementById('add-modal-backdrop')) closeAddModalDirect();
        }
        function closeAddModalDirect() {
            document.getElementById('add-modal-backdrop').classList.remove('open');
            document.body.style.overflow = '';
        }

        function saveRecipe() {
            const name = document.getElementById('f-name').value.trim();
            if (!name) { alert('Every recipe needs a name!'); return; }
            const recipe = {
                id:          'user-' + Date.now(),
                emoji:       document.getElementById('f-emoji').value.trim() || '🍽',
                name,
                category:    document.getElementById('f-category').value,
                desc:        document.getElementById('f-desc').value.trim() || 'A secret recipe from the Wunderland archives.',
                tags:        document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean),
                ingredients: document.getElementById('f-ingredients').value.split('\n').map(s => s.trim()).filter(Boolean),
                steps:       document.getElementById('f-steps').value.split('\n').map(s => s.trim()).filter(Boolean),
            };
            const arr = loadUserRecipes();
            arr.push(recipe);
            saveUserRecipes(arr);
            closeAddModalDirect();
            buildFilters();
            renderGrid();
        }

        // ── Utility ────────────────────────────────────────────────────────────────
        function esc(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeModalDirect(); closeAddModalDirect(); }
        });

        // ── Init ───────────────────────────────────────────────────────────────────
        buildFilters();
        renderGrid();
