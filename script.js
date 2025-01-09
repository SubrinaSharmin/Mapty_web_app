const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
let inputType = document.querySelector('.form__input--type');
let inputDistance = document.querySelector('.form__input--distance');
let inputDuration = document.querySelector('.form__input--duration');
let inputCadence = document.querySelector('.form__input--cadence');
let inputElevation = document.querySelector('.form__input--elevation');

const deleteAllWorkout = document.querySelector('.delete__btn');

///------------------------------Workout Architecture-----------------------------///
//-------Parent class for workout------//
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  // clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; //in km
    this.duration = duration; //in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  // click() {
  //   this.clicks++;
  // }
}
//-----------------------Child classes-----------------------//
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
  }
}

// const run = new Running([39, -12], 5.2, 24, 178);
// const cycling = new Cycling([39, -12], 27, 95, 523);
// console.log(run, cycling);

///------------------------------Application Architecture-----------------------------///
class App {
  #mapZoomLevel = 13;
  #map;
  #mapEvent;
  #workouts = [];
  #currentEditId;

  constructor() {
    // Get user's position
    this._getPosition();
    // Get data from local storage
    this._getLocalStorage();
    // Attach event handlers
    // We are using bind here so that the this keyword points to the app object.
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    deleteAllWorkout.addEventListener('click', this._reset.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
  }

  _getPosition() {
    // Incase old browser
    if (navigator.geolocation)
      //------Fetching geolocation------//
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your location');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    //console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];

    //--------Displaying a map using third-party library called Leaflet------//
    //console.log(this);
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    //console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // L.circle(coords, {
    //   color: '#3E7B27',
    //   fillColor: '#85A947',
    //   fillOpacity: 0.5,
    //   radius: 100,
    // }).addTo(this.#map);
    // Using leaflet build-in event method (on)
    //------Handling clicks on map------//
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    //------hide form----//
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const positiveInputs = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    //------Get data from form------//

    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    if (this.#currentEditId) {
      // Update current workout(edit)
      workout = this.#workouts.find(work => work.id === this.#currentEditId);
      workout.distance = distance;
      workout.duration = duration;

      if (workout.type === 'running') {
        workout.cadence = +inputCadence.value;
      }
      if (workout.type === 'cycling') {
        workout.elevationGain = +inputElevation.value;
      }

      //------Render workout on list------//
      this._renderWorkout(workout);
      //------Set local storage to all workouts---------//
      this._setLocalStorage();

      //Clear current edit Id to prevent accidental updates.
      this.#currentEditId = null;
    } else {
      const type = inputType.value;
      const { lat, lng } = this.#mapEvent.latlng;

      //------If workout running, create running object------//
      if (type === 'running') {
        const cadence = +inputCadence.value;
        //------Check if data is valid------//
        if (
          !validInputs(distance, duration, cadence) ||
          !positiveInputs(distance, duration, cadence)
        )
          return alert('Input have to be positive numbers!');

        workout = new Running([lat, lng], distance, duration, cadence);
      }

      //------If workout cycling, create cycling object------//
      if (type === 'cycling') {
        const elevation = +inputElevation.value;
        //------Check if data is valid------//
        if (
          !validInputs(distance, duration, elevation) ||
          !positiveInputs(distance, duration)
        )
          return alert('Input have to be positive numbers!');
        workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      //------Add new object to workout------//
      this.#workouts.push(workout);
      //------Render workout on map as marker------//
      this._renderWorkoutMarker(workout);
      //------Render workout on list------//
      this._renderWorkout(workout);
      //------Set local storage to all workouts---------//
      this._setLocalStorage();

      //console.log(workout);
    }

    //------Hide form + clear input fields------//
    this._hideForm();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id=${workout.id}>
      <button class="delete__single__workout">Delete</button>
      <button class="edit__single__workout">Edit</button>
      <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    //console.log(workoutEl);

    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    //console.log(workout);
    // setView method from docs.
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1, //Duration of animated panning, in seconds.(from documentation)
      },
    });

    // Using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _editWorkout(e) {
    //Selecting the edit button when it was clicked.
    if (e.target && e.target.classList.contains('edit__single__workout')) {
      // Selecting the closest li element when the condition pass.
      const editItem = e.target.closest('li');

      // Get the data-id from the element
      const id = editItem.dataset.id;
      console.log(id);
      // Matching the selected data with the clicked data using data-id.
      const workout = this.#workouts.find(work => work.id === id);

      // Pre-populating the form with existing data.
      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;
      if (workout.type === 'running') {
        inputCadence.value = workout.cadence;
        // Hide elevation if it's a running workout
        inputElevation.value = '';
      }
      if (workout.type === 'cycling') {
        inputElevation.value = workout.elevationGain;
        // Hide cadence if it's a cycling workout
        inputCadence.value = '';
      }

      // Show the form for editing
      form.classList.remove('hidden');
      inputDistance.focus();

      //Store the ID for use when updating
      this.#currentEditId = id;
    }
  }

  _deleteWorkout(e) {
    // Selecting the button element when it gets clicked.
    if (e.target && e.target.classList.contains('delete__single__workout')) {
      // Get the workout from local storage and converting them to objects.
      const workouts = JSON.parse(localStorage.getItem('workouts'));

      // Selecting the closest li element to remove.
      const deleteItem = e.target.closest('li');

      // Get the data-id to remove selected item.
      const id = deleteItem.dataset.id;

      // Filter out the workout from the #workouts array
      this.#workouts = this.#workouts.filter(work => work.id !== id);

      if (workouts) {
        // Updating the local storage by filtering out only the id matched in both data.
        let updatedWorkout = workouts.filter(work => work.id !== id);

        // Set the local storage with new data.
        localStorage.setItem('workouts', JSON.stringify(updatedWorkout));

        // Removing data from the UI
        if (deleteItem) {
          deleteItem.remove();
          console.log(
            `Workout with ${id} has been deleted from UI and Local storage.`
          );
        } else {
          console.log('Data not found');
        }
      } else {
        console.log('No items on local storage');
      }
    }
  }
}
/* In the App class the constructor method gets executed as soon as the app object gets created. So we can call the _getPosition method there , which is lot cleaner. */
const app = new App();
